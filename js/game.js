// ===================== 游戏状态管理 =====================
const STORAGE_KEY = 'cardBattleGame_v1';

// 默认游戏状态
function getDefaultState() {
  return {
    version: 1,
    currency: { normal: 500, special: 5 },
    exchangeCards: 0, // 兑换卡数量
    collection: {},   // { cardId: count } 已收集的卡牌种类
    inventory: [],    // [{ uid, cardId, timestamp }] 所有卡牌实例
    packs: [],        // [{ uid, packId, timestamp }] 未开启的卡包
    checkin: {
      lastDate: '',   // 上次签到日期
      streak: 0,      // 连续签到天数
      totalDays: 0    // 累计签到天数
    },
    pity: {
      basic: { ssrMiss: 0, urMiss: 0 },
      advanced: { ssrMiss: 0, urMiss: 0 },
      legendary: { ssrMiss: 0, urMiss: 0 }
    },
    exchangeRecords: [], // 兑换记录
    sellRecords: [],     // 出售记录
    systemGiftClaimed: [], // 已领取的系统赠送
    lastSystemGiftTime: null,
    miniGameRecords: { wins: 0, losses: 0, draws: 0 },
    // 新增：PK回归历史记录（最近20次）
    pkHistory: [],
    // 新增：存档元信息
    meta: {
      createdAt: null,
      lastSavedAt: null,
      totalPlayTime: 0,        // 累计游戏秒数
      sessionStartTime: null    // 本次会话开始时间
    }
  };
}

let state = null;

// 加载状态
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = JSON.parse(saved);
      // 版本迁移：补齐新字段（兼容旧存档）
      if (!state.version) {
        // 太老的存档直接重置
        state = getDefaultState();
      } else {
        const def = getDefaultState();
        // 补齐缺失的顶层字段
        if (!state.pkHistory) state.pkHistory = [];
        if (!state.meta) state.meta = def.meta;
        // 补齐 meta 内字段
        if (state.meta.createdAt === undefined) state.meta.createdAt = def.meta.createdAt;
        if (state.meta.lastSavedAt === undefined) state.meta.lastSavedAt = def.meta.lastSavedAt;
        if (state.meta.totalPlayTime === undefined) state.meta.totalPlayTime = def.meta.totalPlayTime;
        // 修复可能被损坏的 currency 字段
        if (typeof state.currency.normal !== 'number' || isNaN(state.currency.normal)) {
          state.currency.normal = def.currency.normal;
        }
        if (typeof state.currency.special !== 'number' || isNaN(state.currency.special)) {
          state.currency.special = def.currency.special;
        }
        // 首次创建时间
        if (!state.meta.createdAt) state.meta.createdAt = Date.now();
      }
      // 记录本次会话开始时间
      state.meta.sessionStartTime = Date.now();
      saveState();
    } else {
      state = getDefaultState();
      state.meta.createdAt = Date.now();
      state.meta.sessionStartTime = Date.now();
      saveState();
    }
  } catch (e) {
    console.error('加载存档失败:', e);
    state = getDefaultState();
    state.meta.createdAt = Date.now();
    state.meta.sessionStartTime = Date.now();
  }
  return state;
}

// 保存状态
function saveState() {
  try {
    if (!state) return;
    if (state.meta) {
      state.meta.lastSavedAt = Date.now();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存存档失败:', e);
  }
}

// 获取状态（供UI读取）
function getState() {
  return state;
}

// ===================== 卡牌操作 =====================
function getCardById(cardId) {
  return CARDS.find(c => c.id === cardId);
}

function getRarityInfo(rarity) {
  return RARITY[rarity];
}

// ===================== 抽卡逻辑 =====================
function drawCardFromPool(pool, forceSSR, forceUR) {
  const rarityKeys = ['N', 'R', 'SR', 'SSR', 'UR'];

  // 如果需要强制SSR+（保底）
  if (forceUR) {
    const urPool = pool['UR'];
    if (urPool.ids && urPool.ids.length > 0) {
      const cardId = urPool.ids[Math.floor(Math.random() * urPool.ids.length)];
      return { card: getCardById(cardId), rarity: 'UR' };
    }
  }

  if (forceSSR) {
    // 在SSR和UR中选择
    const ssrPool = pool['SSR'];
    const urPool = pool['UR'];
    const bothIds = [...(ssrPool.ids || []), ...(urPool.ids || [])];
    if (bothIds.length > 0) {
      const cardId = bothIds[Math.floor(Math.random() * bothIds.length)];
      const card = getCardById(cardId);
      const rarity = card ? card.rarity : 'SSR';
      return { card, rarity };
    }
  }

  // 正常抽卡 - 按权重随机
  let totalWeight = 0;
  const weights = {};
  for (const key of rarityKeys) {
    weights[key] = pool[key].weight;
    totalWeight += pool[key].weight;
  }

  let rand = Math.random() * totalWeight;
  let selectedRarity = 'N';
  for (const key of rarityKeys) {
    rand -= weights[key];
    if (rand <= 0) {
      selectedRarity = key;
      break;
    }
  }

  // 从对应品质池中选一张卡
  const poolData = pool[selectedRarity];
  if (!poolData.ids || poolData.ids.length === 0) {
    const fallbackKeys = rarityKeys.filter(k => pool[k].ids && pool[k].ids.length > 0);
    if (fallbackKeys.length > 0) {
      const fallbackKey = fallbackKeys[Math.floor(Math.random() * fallbackKeys.length)];
      const fallbackPool = pool[fallbackKey];
      const cardId = fallbackPool.ids[Math.floor(Math.random() * fallbackPool.ids.length)];
      return { card: getCardById(cardId), rarity: fallbackKey };
    }
  }

  const cardId = poolData.ids[Math.floor(Math.random() * poolData.ids.length)];
  return { card: getCardById(cardId), rarity: selectedRarity };
}

function getExchangeChance() {
  // 兑换卡概率基础值
  return 0.08;
}

// 开启一个卡包
function openPack(packIdOrUid) {
  // 支持传入 packId 或 pack instance uid
  let packId = packIdOrUid;
  if (packIdOrUid.startsWith && packIdOrUid.startsWith('pack_')) {
    const instance = state.packs.find(p => p.uid === packIdOrUid);
    if (!instance) return null;
    packId = instance.packId;
  }
  
  const pack = PACKS.find(p => p.id === packId);
  if (!pack) return null;

  const pityKey = packId;
  if (!state.pity[pityKey]) {
    state.pity[pityKey] = { ssrMiss: 0, urMiss: 0 };
  }

  const cards = [];
  const exchangeCardsWon = [];

  for (let i = 0; i < pack.cardCount; i++) {
    // 计算保底触发
    const isLastInPack = (i === pack.cardCount - 1);
    
    // SSR+保底: 连续9次没出SSR+，第10次必出
    let forceSSR = false;
    let forceUR = false;
    
    if (state.pity[pityKey].ssrMiss >= 9) {
      forceSSR = true;
    }
    // UR保底: 连续49次没出UR，第50次必出
    if (state.pity[pityKey].urMiss >= 49) {
      forceUR = true;
    }
    // 最后一张且本包没有SSR+，强制保底（如果没触发硬保底）
    if (isLastInPack && !forceSSR) {
      const packHasSSR = cards.some(c => c.rarity === 'SSR' || c.rarity === 'UR');
      if (!packHasSSR && state.pity[pityKey].ssrMiss >= 4) {
        forceSSR = true;
      }
    }

    const result = drawCardFromPool(pack.pool, forceSSR, forceUR);
    const rarity = result.rarity;

    // 更新保底计数器
    if (rarity === 'SSR' || rarity === 'UR') {
      state.pity[pityKey].ssrMiss = 0;
    } else {
      state.pity[pityKey].ssrMiss++;
    }

    if (rarity === 'UR') {
      state.pity[pityKey].urMiss = 0;
    } else {
      state.pity[pityKey].urMiss++;
    }

    // 生成唯一ID
    const uid = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    cards.push({
      uid,
      cardId: result.card.id,
      timestamp: Date.now(),
      card: result.card,
      rarity
    });

    // 检查兑换卡
    if (Math.random() < pack.exchangeCardChance) {
      exchangeCardsWon.push({
        uid: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      });
    }
  }

  // 存入背包
  for (const card of cards) {
    state.inventory.push({
      uid: card.uid,
      cardId: card.cardId,
      timestamp: card.timestamp
    });
  }

  // 更新图鉴
  for (const card of cards) {
    if (!state.collection[card.cardId]) {
      state.collection[card.cardId] = 0;
    }
    state.collection[card.cardId]++;
  }

  // 增加兑换卡
  state.exchangeCards += exchangeCardsWon.length;

  saveState();

  return {
    cards: cards.map(c => ({
      uid: c.uid,
      cardId: c.cardId,
      card: c.card,
      rarity: c.rarity
    })),
    exchangeCards: exchangeCardsWon.length,
    packName: pack.name
  };
}

// ===================== 卡包操作 =====================
function buyPack(packId, buyType = 'normal') {
  const pack = PACKS.find(p => p.id === packId);
  if (!pack) return { success: false, msg: '卡包不存在' };

  const price = pack.price;
  let cost = 0;
  let currencyType = '';

  if (buyType === 'normal' && price.normal > 0) {
    cost = price.normal;
    currencyType = 'normal';
  } else if (buyType === 'special' && price.special > 0) {
    cost = price.special;
    currencyType = 'special';
  } else {
    return { success: false, msg: '该卡包不支持此货币购买' };
  }

  if (state.currency[currencyType] < cost) {
    return { success: false, msg: `${currencyType === 'normal' ? '普通' : '特殊'}货币不足` };
  }

  state.currency[currencyType] -= cost;

  // 创建卡包实例
  const packInstance = {
    uid: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    packId,
    timestamp: Date.now()
  };

  state.packs.push(packInstance);
  saveState();

  return { success: true, pack: packInstance };
}

// 从仓库删除卡包（开启后）
function removePackFromWarehouse(packUid) {
  const idx = state.packs.findIndex(p => p.uid === packUid);
  if (idx >= 0) {
    state.packs.splice(idx, 1);
    saveState();
  }
}

// ===================== 货币操作 =====================
function addCurrency(normal = 0, special = 0) {
  // 类型验证：确保不会因传错参数而损坏存档
  const n = Number(normal) || 0;
  const s = Number(special) || 0;
  state.currency.normal = (state.currency.normal || 0) + n;
  state.currency.special = (state.currency.special || 0) + s;
  saveState();
}

function spendCurrency(normal = 0, special = 0) {
  const n = Number(normal) || 0;
  const s = Number(special) || 0;
  if ((state.currency.normal || 0) < n || (state.currency.special || 0) < s) {
    return false;
  }
  state.currency.normal -= n;
  state.currency.special -= s;
  saveState();
  return true;
}

function getCurrency() {
  return { ...state.currency };
}

// ===================== 兑换卡操作 =====================
function addExchangeCards(count) {
  state.exchangeCards += count;
  saveState();
}

function spendExchangeCards(count) {
  if (state.exchangeCards < count) return false;
  state.exchangeCards -= count;
  saveState();
  return true;
}

function getExchangeCardCount() {
  return state.exchangeCards;
}

// ===================== 签到系统 =====================
function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function isCheckedInToday() {
  return state.checkin.lastDate === getTodayDateStr();
}

function checkIn() {
  if (isCheckedInToday()) {
    return { success: false, msg: '今日已签到' };
  }

  const today = getTodayDateStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

  if (state.checkin.lastDate === yesterdayStr) {
    state.checkin.streak++;
  } else {
    state.checkin.streak = 1;
  }

  state.checkin.totalDays++;
  state.checkin.lastDate = today;

  const dayIndex = (state.checkin.streak - 1) % CHECKIN_REWARDS.length;
  const reward = CHECKIN_REWARDS[dayIndex];

  addCurrency(reward.normal, reward.special);

  saveState();

  return { 
    success: true, 
    reward,
    streak: state.checkin.streak,
    totalDays: state.checkin.totalDays
  };
}

// ===================== 出售系统 =====================
function sellCards(uids) {
  let totalNormal = 0;
  const raritiesSold = {};

  for (const uid of uids) {
    const idx = state.inventory.findIndex(c => c.uid === uid);
    if (idx >= 0) {
      const cardInstance = state.inventory[idx];
      const card = getCardById(cardInstance.cardId);
      const rarityInfo = getRarityInfo(card.rarity);
      totalNormal += rarityInfo.sellPrice;
      raritiesSold[card.rarity] = (raritiesSold[card.rarity] || 0) + 1;
      state.inventory.splice(idx, 1);
      
      // 图鉴计数减少
      if (state.collection[cardInstance.cardId]) {
        state.collection[cardInstance.cardId]--;
        if (state.collection[cardInstance.cardId] <= 0) {
          delete state.collection[cardInstance.cardId];
        }
      }
    }
  }

  if (totalNormal > 0) {
    addCurrency(totalNormal, 0);
    state.sellRecords.push({
      timestamp: Date.now(),
      totalNormal,
      count: uids.length
    });
    saveState();
  }

  return { success: true, totalNormal, count: uids.length };
}

// ===================== 兑换系统 =====================
function isLimitedExchangeActive(limitedItem) {
  if (!limitedItem.startTime) return false;
  const start = new Date(limitedItem.startTime).getTime();
  const now = Date.now();
  const durationMs = limitedItem.durationHours * 3600 * 1000;
  return now >= start && now <= start + durationMs;
}

function getLimitedExchangeStatus(limitedItem) {
  if (!limitedItem.startTime) {
    return { active: false, remainingHours: 0, msg: '未开放' };
  }
  const start = new Date(limitedItem.startTime).getTime();
  const now = Date.now();
  const durationMs = limitedItem.durationHours * 3600 * 1000;
  const end = start + durationMs;

  if (now < start) {
    return { 
      active: false, 
      remainingHours: Math.ceil((start - now) / 3600000),
      msg: `${Math.ceil((start - now) / 3600000)}小时后开启` 
    };
  }
  if (now > end) {
    return { active: false, remainingHours: 0, msg: '已结束' };
  }
  return { 
    active: true, 
    remainingHours: Math.ceil((end - now) / 3600000),
    msg: `剩余${Math.ceil((end - now) / 3600000)}小时` 
  };
}

function exchangeCard(cardId, cost) {
  if (state.exchangeCards < cost) {
    return { success: false, msg: '兑换卡数量不足，无法兑换' };
  }

  const card = getCardById(cardId);
  if (!card) return { success: false, msg: '卡牌不存在' };

  state.exchangeCards -= cost;

  // 添加到背包
  const uid = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  state.inventory.push({ uid, cardId, timestamp: Date.now() });

  // 更新图鉴
  if (!state.collection[cardId]) {
    state.collection[cardId] = 0;
  }
  state.collection[cardId]++;

  state.exchangeRecords.push({
    timestamp: Date.now(),
    cardId,
    cost
  });

  saveState();
  return { success: true, card };
}

// 开启限时兑换
function openLimitedExchange(limitedId) {
  const item = EXCHANGE_CONFIG.limited.find(l => l.id === limitedId);
  if (item) {
    item.startTime = new Date().toISOString();
    saveState();
  }
}

// ===================== 系统赠送 =====================
function checkAndClaimSystemGifts() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = getTodayDateStr();

  const claimed = state.systemGiftClaimed.filter(c => c.date === today);
  const claimedTypes = claimed.map(c => c.type);

  const available = [];
  for (const gift of SYSTEM_GIFTS) {
    if (currentHour === gift.hour && claimedTypes.indexOf(gift.desc) === -1) {
      available.push(gift);
    }
  }

  return available;
}

function claimSystemGift(giftDesc) {
  const today = getTodayDateStr();
  const gift = SYSTEM_GIFTS.find(g => g.desc === giftDesc);
  if (!gift) return { success: false };

  const alreadyClaimed = state.systemGiftClaimed.find(
    c => c.date === today && c.type === giftDesc
  );
  if (alreadyClaimed) return { success: false, msg: '今日已领取' };

  addCurrency(gift.normal, gift.special);
  state.systemGiftClaimed.push({
    date: today,
    type: giftDesc,
    timestamp: Date.now()
  });
  saveState();
  return { success: true, gift };
}

// ===================== 收集进度奖励 =====================
function checkCollectionRewards() {
  const collected = Object.keys(state.collection).length;
  const claimed = state.systemGiftClaimed.filter(c => c.type.startsWith('collection_'));
  const claimedThresholds = claimed.map(c => parseInt(c.type.replace('collection_', '')));

  const available = [];
  for (const reward of COLLECTION_REWARDS) {
    if (collected >= reward.threshold && !claimedThresholds.includes(reward.threshold)) {
      available.push(reward);
    }
  }
  return available;
}

function claimCollectionReward(threshold) {
  const reward = COLLECTION_REWARDS.find(r => r.threshold === threshold);
  if (!reward) return { success: false };

  const claimed = state.systemGiftClaimed.find(
    c => c.type === `collection_${threshold}`
  );
  if (claimed) return { success: false, msg: '已领取' };

  addCurrency(reward.reward.normal, reward.reward.special);
  state.systemGiftClaimed.push({
    date: getTodayDateStr(),
    type: `collection_${threshold}`,
    timestamp: Date.now()
  });
  saveState();
  return { success: true, reward };
}

// ===================== 小游戏 =====================
function playCompareGame(userCard = null) {
  // 生成1-10的随机牌
  const systemCard = Math.floor(Math.random() * 10) + 1;
  const user = userCard || Math.floor(Math.random() * 10) + 1;

  let result = 'win';
  let reward = 0;

  if (user > systemCard) {
    result = 'win';
    reward = Math.floor(Math.random() * (MINIGAME_CONFIG.compare.maxWin - MINIGAME_CONFIG.compare.minWin + 1)) + MINIGAME_CONFIG.compare.minWin;
    state.miniGameRecords.wins++;
    
    // 特殊大奖
    if (Math.random() < MINIGAME_CONFIG.compare.specialChance) {
      reward *= 3;
      addCurrency(reward, 2);
    } else {
      addCurrency(reward, 0);
    }
  } else if (user < systemCard) {
    result = 'lose';
    state.miniGameRecords.losses++;
  } else {
    result = 'draw';
    reward = MINIGAME_CONFIG.compare.drawReward;
    state.miniGameRecords.draws++;
    addCurrency(reward, 0);
  }

  saveState();
  return { user, systemCard, result, reward };
}

// ===================== 出售模式辅助 =====================
function getInventoryCards() {
  return state.inventory.map(instance => {
    const card = getCardById(instance.cardId);
    return { ...instance, card };
  });
}

// ===================== K-POP PK 战斗系统 =====================

// 从玩家背包中获取所有卡牌（带属性）
function getInventoryCardsWithStats() {
  return state.inventory.map(instance => {
    const card = getCardById(instance.cardId);
    if (!card) return null;
    return {
      uid: instance.uid,
      cardId: instance.cardId,
      card: card,
      style: card.style,
      dance: card.dance,
      vocal: card.vocal,
      visual: card.visual,
      popularity: card.popularity
    };
  }).filter(Boolean);
}

// 计算一张卡的风格加成系数
function calcStyleBonus(cardStyle, themeStyle) {
  if (cardStyle === themeStyle) return 1.3;
  const affinity = STYLE_AFFINITY[themeStyle]?.[cardStyle] || 0;
  // 关联度转换为加成系数：0-100 → 0.7-1.3
  return 0.7 + (affinity / 100) * 0.6;
}

// 计算一组卡牌的三个分数
function calculateScores(cards, themeStyle) {
  if (!cards || cards.length === 0) {
    return { broadcast: 0, vote: 0, style: 0, total: 0 };
  }
  const n = cards.length;
  let danceSum = 0, vocalSum = 0, visualSum = 0, popularitySum = 0, styleSum = 0;

  for (const card of cards) {
    const cardData = card.card || card;
    const styleKey = card.style || cardData.style;
    const bonus = calcStyleBonus(styleKey, themeStyle);
    danceSum += (card.dance || cardData.dance || 0) * bonus;
    vocalSum += (card.vocal || cardData.vocal || 0) * bonus;
    visualSum += (card.visual || cardData.visual || 0) * bonus;
    popularitySum += (card.popularity || cardData.popularity || 0) * bonus;
    styleSum += bonus * 50; // 风格分基于加成系数
  }

  const broadcast = Math.round((danceSum / n) + (vocalSum / n));
  const vote = Math.round((visualSum / n) + (popularitySum / n));
  const styleScore = Math.round(styleSum / n);
  const total = broadcast + vote + styleScore;

  return { broadcast, vote, style: styleScore, total };
}

// 生成3张随机专辑 (一组3张)
function generateAlbumGroup() {
  const styleKeys = Object.keys(STYLES);
  const scaleKeys = Object.keys(ALBUM_SCALES);
  const albums = [];

  for (let i = 0; i < 3; i++) {
    const styleKey = styleKeys[Math.floor(Math.random() * styleKeys.length)];
    const scaleKey = scaleKeys[i]; // solo, mini, full
    const theme = STYLES[styleKey];
    const scale = ALBUM_SCALES[scaleKey];

    albums.push({
      id: `album_${Date.now()}_${i}_${Math.random().toString(36).substr(2,5)}`,
      style: styleKey,
      styleName: theme.name,
      styleEmoji: theme.emoji,
      scale: scaleKey,
      scaleName: scale.name,
      cardCount: scale.cardCount
    });
  }

  return albums;
}

// 生成12轮 (4组 × 3张专辑)
function generate12Rounds() {
  const allAlbums = [];
  for (let g = 0; g < 4; g++) {
    const group = generateAlbumGroup();
    allAlbums.push(...group);
  }
  return allAlbums;
}

// 电脑选牌（从全体卡池中随机选指定数量的卡）
function generateEnemyCards(themeStyle, count) {
  const allCards = [...CARDS];
  // 按风格关联度排序倾向选择风格匹配的卡
  const sortedCards = allCards.map(c => ({
    card: c,
    bonus: calcStyleBonus(c.style, themeStyle),
    rand: Math.random()
  }));
  // 60%概率选风格匹配的，40%随机
  sortedCards.sort((a, b) => {
    if (Math.random() < 0.5) return b.bonus - a.bonus;
    return a.rand - b.rand;
  });
  return sortedCards.slice(0, count).map(item => item.card);
}

// 执行一次PK对战 (使用整体主题风格计算加成)
function performBattle(playerCards, album, themeStyle) {
  const { style, cardCount, scaleName } = album;

  // 生成敌方卡牌
  const enemyCards = generateEnemyCards(style, cardCount);

  // 使用整体主题风格计算双方分数
  const playerScores = calculateScores(playerCards, themeStyle);
  const enemyScores = calculateScores(enemyCards, themeStyle);

  const totalScore = playerScores.total + enemyScores.total;
  const playerWinProb = playerScores.total / totalScore;

  // 随机判定
  const rand = Math.random();
  const playerWins = rand < playerWinProb;

  return {
    album,
    themeStyle,
    playerCards,
    enemyCards,
    playerScores,
    enemyScores,
    playerWinProb: Math.round(playerWinProb * 1000) / 10,
    result: playerWins ? 'win' : 'lose',
    winnerCards: playerWins ? playerCards : enemyCards,
    winnerScores: playerWins ? playerScores : enemyScores
  };
}

// 获取评价等级
function getEvaluation(wins) {
  for (const level of EVALUATION_LEVELS) {
    if (wins >= level.min) {
      return level;
    }
  }
  return EVALUATION_LEVELS[EVALUATION_LEVELS.length - 1];
}

// 添加一条PK历史记录
function addPKHistory(record) {
  if (!state.pkHistory) state.pkHistory = [];
  state.pkHistory.unshift({
    timestamp: Date.now(),
    ...record
  });
  // 只保留最近20条
  if (state.pkHistory.length > 20) {
    state.pkHistory = state.pkHistory.slice(0, 20);
  }
  saveState();
}

// 获取PK历史记录
function getPKHistory(limit = 20) {
  if (!state.pkHistory) return [];
  return state.pkHistory.slice(0, limit);
}

// 获取存档摘要信息（用于UI显示）
function getSaveInfo() {
  if (!state.meta) return null;
  const playTimeSec = (state.meta.totalPlayTime || 0) +
    (state.meta.sessionStartTime ? Math.floor((Date.now() - state.meta.sessionStartTime) / 1000) : 0);
  return {
    createdAt: state.meta.createdAt,
    lastSavedAt: state.meta.lastSavedAt,
    totalPlayTime: playTimeSec,
    pkCount: (state.pkHistory || []).length,
    inventoryCount: (state.inventory || []).length,
    packsCount: (state.packs || []).length,
    collectionCount: Object.keys(state.collection || {}).length
  };
}

// 在页面关闭/隐藏时保存会话时长
function flushPlayTime() {
  if (!state || !state.meta || !state.meta.sessionStartTime) return;
  const now = Date.now();
  const sessionSec = Math.floor((now - state.meta.sessionStartTime) / 1000);
  state.meta.totalPlayTime = (state.meta.totalPlayTime || 0) + sessionSec;
  state.meta.sessionStartTime = now;  // 重置会话开始时间
  saveState();
}

// 生成3个可选专辑（不同风格+不同规模）
function generateAlbumOptions() {
  const styleKeys = Object.keys(STYLES);
  const scaleKeys = Object.keys(ALBUM_SCALES);
  const albums = [];

  for (let i = 0; i < 3; i++) {
    const styleKey = styleKeys[Math.floor(Math.random() * styleKeys.length)];
    const scaleKey = scaleKeys[i]; // solo, mini, full
    const theme = STYLES[styleKey];
    const scale = ALBUM_SCALES[scaleKey];

    albums.push({
      id: `album_opt_${Date.now()}_${i}_${Math.random().toString(36).substr(2,5)}`,
      style: styleKey,
      styleName: theme.name,
      styleEmoji: theme.emoji,
      scale: scaleKey,
      scaleName: scale.name,
      cardCount: scale.cardCount
    });
  }

  return albums;
}

// 开始回归（玩家选择一个专辑进行PK）
function startRegression() {
  const styleKeys = Object.keys(STYLES);
  const themeStyle = styleKeys[Math.floor(Math.random() * styleKeys.length)];
  const theme = STYLES[themeStyle];
  const albumOptions = generateAlbumOptions();
  
  return {
    themeStyle,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    albumOptions,
    selectedAlbum: null,
    usedCardUids: new Set(),
    status: 'selecting_album'
  };
}

// 从战斗结果中计算胜率
function calcWinProbability(battleResult) {
  if (!battleResult) return 0;
  return battleResult.playerWinProb / 100; // playerWinProb已是百分比0-100
}

// 模拟12次回归结算
function simulate12Rounds(winProb) {
  let wins = 0;
  const roundResults = [];
  for (let i = 0; i < 12; i++) {
    const win = Math.random() < winProb;
    if (win) wins++;
    roundResults.push(win);
  }
  return { wins, totalRounds: 12, roundResults };
}

// 提交单个专辑的卡牌进行PK
function submitBattle(regression, album, playerCards) {
  if (!album || !playerCards || playerCards.length === 0) {
    return { success: false, msg: '请选择专辑和卡牌' };
  }
  if (playerCards.length < album.cardCount) {
    return { success: false, msg: `${album.scaleName}需要${album.cardCount}张卡牌` };
  }
  
  // 检查重复卡牌
  const uids = playerCards.map(c => c.uid);
  const uniqueUids = new Set(uids);
  if (uids.length !== uniqueUids.size) {
    return { success: false, msg: '不能选择相同的卡牌' };
  }
  
  const themeStyle = regression.themeStyle;
  const battle = performBattle(playerCards.slice(0, album.cardCount), album, themeStyle);
  
  return {
    success: true,
    battle,
    album,
    winProb: battle.playerWinProb / 100
  };
}

// ===================== 重置存档 =====================
function resetGame() {
  state = getDefaultState();
  saveState();
}

// ===================== 导出API =====================
window.Game = {
  loadState, getState, saveState,
  getCardById, getRarityInfo,
  buyPack, openPack, removePackFromWarehouse,
  addCurrency, spendCurrency, getCurrency,
  addExchangeCards, spendExchangeCards, getExchangeCardCount,
  isCheckedInToday, checkIn, getTodayDateStr,
  sellCards, getInventoryCards,
  isLimitedExchangeActive, getLimitedExchangeStatus,
  exchangeCard, openLimitedExchange,
  checkAndClaimSystemGifts, claimSystemGift,
  checkCollectionRewards, claimCollectionReward,
  playCompareGame,
  resetGame,
  // PK战斗系统
  getInventoryCardsWithStats,
  calcStyleBonus,
  calculateScores,
  generateAlbumOptions,
  calcWinProbability,
  simulate12Rounds,
  generateEnemyCards,
  performBattle,
  getEvaluation,
  startRegression,
  submitBattle,
  // 存档/历史记录
  addPKHistory,
  getPKHistory,
  getSaveInfo,
  flushPlayTime
};