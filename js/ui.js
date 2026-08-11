// ===================== UI 渲染与交互 =====================
const UI = {
  currentView: 'home',
  selectedCards: [], // 出售模式下选中的卡牌uid
  sellMode: false,

  // ===================== 初始化 =====================
  init() {
    Game.loadState();
    this.setupEventListeners();
    this.showView('home');
    this.updateStatusBar();
    this.checkSystemGifts();
    this.checkCollectionRewards();
    this.setupAutoSave();
  },

  // ===================== 自动保存机制 =====================
  setupAutoSave() {
    // 页面隐藏时（切到后台标签页等）保存游戏时长
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Game.flushPlayTime();
      } else {
        // 重新激活时重置会话开始时间
        const st = Game.getState();
        if (st && st.meta) {
          st.meta.sessionStartTime = Date.now();
          Game.saveState();
        }
      }
    });

    // 页面关闭前保存
    window.addEventListener('beforeunload', () => {
      Game.flushPlayTime();
    });

    // 每隔30秒自动保存一次（防止意外丢失）
    setInterval(() => {
      Game.saveState();
    }, 30000);
  },

  // 显示"已自动保存"提示
  showSaveToast() {
    this.showToast('✓ 游戏进度已自动保存');
  },

  setupEventListeners() {
    // Tab导航
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.showView(view);
      });
    });
  },

  // ===================== 视图切换 =====================
  showView(viewName) {
    this.currentView = viewName;
    this.selectedCards = [];
    this.sellMode = false;

    // 更新tab选中状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // 隐藏所有视图
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    
    // 显示目标视图
    const viewMap = {
      home: 'view-home',
      shop: 'view-shop',
      warehouse: 'view-warehouse',
      collection: 'view-collection',
      inventory: 'view-inventory'
    };

    const el = document.getElementById(viewMap[viewName]);
    if (el) {
      el.classList.remove('hidden');
    }

    // 渲染对应视图
    switch (viewName) {
      case 'home': this.renderHome(); break;
      case 'shop': this.renderShop(); break;
      case 'warehouse': this.renderWarehouse(); break;
      case 'collection': this.renderCollection(); break;
      case 'inventory': this.renderInventory(); break;
    }

    this.updateStatusBar();
  },

  // ===================== 状态栏 =====================
  updateStatusBar() {
    const state = Game.getState();
    const currency = Game.getCurrency();
    
    document.getElementById('currency-normal').textContent = `💰 ${currency.normal}`;
    document.getElementById('currency-special').textContent = `💎 ${currency.special}`;
    document.getElementById('exchange-count').textContent = `🎟️ ${state.exchangeCards}`;
    
    // 更新存档状态显示
    this.updateSaveStatus();
  },

  // 更新存档状态显示
  updateSaveStatus() {
    const saveStatus = document.getElementById('save-status');
    if (!saveStatus) return;
    const info = Game.getSaveInfo();
    if (!info || !info.lastSavedAt) {
      saveStatus.textContent = '💾 新存档';
      saveStatus.title = '首次进入，进度将自动保存';
      return;
    }
    const ago = this.formatTimeAgo(info.lastSavedAt);
    saveStatus.textContent = '💾 已保存';
    saveStatus.title = `上次保存：${ago}\n游戏时长：${this.formatPlayTime(info.totalPlayTime)}\nPK次数：${info.pkCount}\n创建时间：${new Date(info.createdAt).toLocaleString('zh-CN')}`;
  },

  // 格式化"X时间前"
  formatTimeAgo(timestamp) {
    if (!timestamp) return '未知';
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return `${sec}秒前`;
    if (sec < 3600) return `${Math.floor(sec / 60)}分钟前`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}小时前`;
    return `${Math.floor(sec / 86400)}天前`;
  },

  // 格式化游戏时长
  formatPlayTime(sec) {
    if (!sec) return '0秒';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}小时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  },

  // ===================== 首页 =====================
  renderHome() {
    const state = Game.getState();
    const checked = Game.isCheckedInToday();
    const rewards = Game.checkCollectionRewards();
    const gifts = Game.checkAndClaimSystemGifts();
    const inventoryStats = Game.getInventoryCardsWithStats();

    const home = document.getElementById('view-home');
    home.innerHTML = `
      <div class="home-container">
        <div class="home-banner kpop-banner">
          <h1>🎵 K-POP 抽卡对战</h1>
          <p class="subtitle">收集偶像成员，征服音乐回归！</p>
        </div>

        <div class="pk-banner-card" id="action-pk">
          <div class="pk-banner-icon">🏆</div>
          <div class="pk-banner-info">
            <div class="pk-banner-title">开始回归 PK</div>
            <div class="pk-banner-desc">选择专辑阵容，挑战12次回归，争取一位！</div>
          </div>
          <div class="pk-banner-arrow">→</div>
        </div>

        <div class="home-actions">
          <div class="action-grid">
            <div class="action-card ${checked ? 'disabled' : ''}" id="action-checkin">
              <div class="action-icon">📅</div>
              <div class="action-title">每日签到</div>
              <div class="action-desc">${checked ? '今日已签到' : '领取每日奖励'}</div>
              ${state.checkin.streak > 0 ? `<div class="action-badge">连续${state.checkin.streak}天</div>` : ''}
            </div>

            <div class="action-card" id="action-minigame">
              <div class="action-icon">🎮</div>
              <div class="action-title">比大小游戏</div>
              <div class="action-desc">赢取普通货币奖励</div>
            </div>

            <div class="action-card" id="action-recharge">
              <div class="action-icon">💳</div>
              <div class="action-title">充值中心</div>
              <div class="action-desc">购买货币和礼包</div>
            </div>

            <div class="action-card ${gifts.length === 0 ? 'disabled' : ''}" id="action-system-gift">
              <div class="action-icon">🎁</div>
              <div class="action-title">系统礼包</div>
              <div class="action-desc">${gifts.length > 0 ? `可领取${gifts.length}个礼包` : '暂无可用礼包'}</div>
              ${gifts.length > 0 ? '<div class="action-notify"></div>' : ''}
            </div>

            <div class="action-card ${rewards.length === 0 ? 'disabled' : ''}" id="action-collection-reward">
              <div class="action-icon">🏆</div>
              <div class="action-title">收集奖励</div>
              <div class="action-desc">${rewards.length > 0 ? `${rewards.length}个奖励可领` : '暂无新奖励'}</div>
              ${rewards.length > 0 ? '<div class="action-notify"></div>' : ''}
            </div>

            <div class="action-card" id="action-exchange-info">
              <div class="action-icon">🔄</div>
              <div class="action-title">兑换中心</div>
              <div class="action-desc">使用兑换卡换取稀有卡牌</div>
            </div>
          </div>
        </div>

        <div class="home-stats">
          <div class="stat-item">
            <div class="stat-value">${Object.keys(state.collection).length}</div>
            <div class="stat-label">已收集</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${state.inventory.length}</div>
            <div class="stat-label">背包卡牌</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${state.packs.length}</div>
            <div class="stat-label">未开卡包</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${inventoryStats.length > 0 ? Math.round(inventoryStats.reduce((s,c) => s + (c.dance||0)+(c.vocal||0)+(c.visual||0)+(c.popularity||0), 0) / Math.max(1, inventoryStats.length)) : 0}</div>
            <div class="stat-label">平均战力</div>
          </div>
        </div>

        ${this.renderSaveInfoCard()}
      </div>
    `;

    this.bindHomeEvents();
  },

  // 渲染存档信息卡片
  renderSaveInfoCard() {
    const info = Game.getSaveInfo();
    if (!info) return '';
    const pkHistory = Game.getPKHistory(5);
    
    return `
      <div class="save-info-card">
        <div class="sic-header">
          <span class="sic-title">💾 游戏存档</span>
          <span class="sic-status">已自动保存</span>
        </div>
        <div class="sic-grid">
          <div class="sic-item">
            <div class="sic-label">背包卡牌</div>
            <div class="sic-value">${info.inventoryCount}</div>
          </div>
          <div class="sic-item">
            <div class="sic-label">未开卡包</div>
            <div class="sic-value">${info.packsCount}</div>
          </div>
          <div class="sic-item">
            <div class="sic-label">图鉴收集</div>
            <div class="sic-value">${info.collectionCount}</div>
          </div>
          <div class="sic-item">
            <div class="sic-label">PK回归次数</div>
            <div class="sic-value">${info.pkCount}</div>
          </div>
          <div class="sic-item">
            <div class="sic-label">游戏时长</div>
            <div class="sic-value">${this.formatPlayTime(info.totalPlayTime)}</div>
          </div>
          <div class="sic-item">
            <div class="sic-label">上次保存</div>
            <div class="sic-value">${this.formatTimeAgo(info.lastSavedAt)}</div>
          </div>
        </div>
        ${pkHistory.length > 0 ? `
          <div class="sic-history">
            <div class="sic-history-title">最近回归记录</div>
            ${pkHistory.map(h => `
              <div class="sic-history-item">
                <span class="sic-h-theme">${h.themeEmoji || '🎵'} ${h.theme || '未知'}</span>
                <span class="sic-h-album">${h.albumScale || ''} · ${h.albumStyle || ''}</span>
                <span class="sic-h-result">${h.wins}/${h.totalRounds}</span>
                <span class="sic-h-eval">${h.evaluation || ''}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div class="sic-actions">
          <button class="btn btn-small btn-secondary" id="btn-export-save">📤 导出存档</button>
          <button class="btn btn-small btn-danger" id="btn-reset-save">⚠️ 重置存档</button>
        </div>
        <div class="sic-tip">提示：游戏进度会自动保存到本设备浏览器，刷新或关闭后再次打开会保留所有进度</div>
      </div>
    `;
  },

  // 绑定存档卡片事件（在bindHomeEvents后调用）
  bindSaveCardEvents() {
    const exportBtn = document.getElementById('btn-export-save');
    const resetBtn = document.getElementById('btn-reset-save');
    
    if (exportBtn) {
      exportBtn.onclick = () => this.showExportSaveDialog();
    }
    if (resetBtn) {
      resetBtn.onclick = () => this.showResetSaveDialog();
    }
  },

  // 导出存档对话框
  showExportSaveDialog() {
    const data = JSON.stringify(Game.getState(), null, 2);
    const dialog = this.createModal(`
      <div class="dialog export-dialog">
        <h2>📤 导出存档</h2>
        <p class="export-tip">复制以下文本保存到文件，下次可在其他设备导入</p>
        <textarea id="export-text" readonly>${data}</textarea>
        <div class="export-actions">
          <button class="btn btn-primary" id="btn-copy-save">📋 复制到剪贴板</button>
          <button class="btn btn-secondary" id="btn-close-export">关闭</button>
        </div>
      </div>
    `);
    
    document.getElementById('btn-copy-save').onclick = () => {
      const text = document.getElementById('export-text');
      text.select();
      try {
        document.execCommand('copy');
        this.showToast('✓ 已复制到剪贴板');
      } catch (e) {
        this.showToast('复制失败，请手动选择复制');
      }
    };
    document.getElementById('btn-close-export').onclick = () => this.closeModal();
  },

  // 重置存档对话框
  showResetSaveDialog() {
    const dialog = this.createModal(`
      <div class="dialog reset-dialog">
        <h2>⚠️ 重置存档</h2>
        <p class="reset-warning">此操作将清空所有游戏进度，包括：</p>
        <ul class="reset-list">
          <li>💰 所有货币（普通/特殊/兑换卡）</li>
          <li>🎒 背包中所有卡牌</li>
          <li>📦 仓库中所有卡包</li>
          <li>📖 图鉴收集记录</li>
          <li>🏆 PK回归历史</li>
          <li>📅 签到记录</li>
        </ul>
        <p class="reset-confirm">确定要重置吗？此操作不可恢复！</p>
        <div class="reset-actions">
          <button class="btn btn-danger" id="btn-confirm-reset">确认重置</button>
          <button class="btn btn-secondary" id="btn-cancel-reset">取消</button>
        </div>
      </div>
    `);
    
    document.getElementById('btn-confirm-reset').onclick = () => {
      Game.resetGame();
      this.closeModal();
      this.showToast('存档已重置');
      this.showView('home');
      this.updateStatusBar();
      this.renderHome();
    };
    document.getElementById('btn-cancel-reset').onclick = () => this.closeModal();
  },

  bindHomeEvents() {
    const state = Game.getState();

    document.getElementById('action-pk').onclick = () => {
      this.startPKFlow();
    };

    document.getElementById('action-checkin').onclick = () => {
      if (Game.isCheckedInToday()) {
        this.showToast('今日已签到');
        return;
      }
      this.showCheckinDialog();
    };

    document.getElementById('action-minigame').onclick = () => {
      this.showMiniGameDialog();
    };

    document.getElementById('action-recharge').onclick = () => {
      this.showRechargeDialog();
    };

    document.getElementById('action-system-gift').onclick = () => {
      this.showSystemGiftDialog();
    };

    document.getElementById('action-collection-reward').onclick = () => {
      this.showCollectionRewardDialog();
    };

    document.getElementById('action-exchange-info').onclick = () => {
      this.showExchangeView();
    };

    // 绑定存档卡片事件
    this.bindSaveCardEvents();
  },

  // ===================== 签到弹窗 =====================
  showCheckinDialog() {
    const state = Game.getState();
    const dayIndex = state.checkin.streak % CHECKIN_REWARDS.length;
    const currentReward = CHECKIN_REWARDS[dayIndex];
    const nextReward = CHECKIN_REWARDS[(dayIndex + 1) % CHECKIN_REWARDS.length];

    const dialog = this.createModal(`
      <div class="dialog checkin-dialog">
        <h2>📅 每日签到</h2>
        <div class="checkin-progress">
          ${CHECKIN_REWARDS.map((r, i) => `
            <div class="checkin-day ${i <= dayIndex ? 'checked' : ''} ${i === dayIndex && !Game.isCheckedInToday() ? 'current' : ''}">
              <div class="day-num">第${i + 1}天</div>
              <div class="day-reward">${r.desc}</div>
            </div>
          `).join('')}
        </div>
        <div class="checkin-info">
          <p>当前连续签到: <strong>${state.checkin.streak}</strong> 天</p>
          <p>累计签到: <strong>${state.checkin.totalDays}</strong> 天</p>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary" id="confirm-checkin">
            ${Game.isCheckedInToday() ? '已签到' : `签到领取 ${currentReward.desc}`}
          </button>
          <button class="btn btn-secondary" onclick="UI.closeModal()">关闭</button>
        </div>
      </div>
    `);

    dialog.querySelector('#confirm-checkin').onclick = () => {
      if (Game.isCheckedInToday()) {
        this.closeModal();
        return;
      }
      const result = Game.checkIn();
      if (result.success) {
        this.showToast(`签到成功！获得 ${result.reward.desc}`);
        this.closeModal();
        this.renderHome();
        this.updateStatusBar();
      } else {
        this.showToast(result.msg);
      }
    };
  },

  // ===================== 商店 =====================
  renderShop() {
    const shop = document.getElementById('view-shop');
    
    let html = `
      <div class="shop-container">
        <div class="shop-section-title">🔥 卡包商店</div>
        <div class="pack-grid">
    `;

    for (const pack of PACKS) {
      const basicInfo = {
        basic: { icon: '📦', gradient: 'linear-gradient(135deg, #4ade80, #22c55e)' },
        advanced: { icon: '🎁', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
        legendary: { icon: '👑', gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }
      };
      const info = basicInfo[pack.id];

      html += `
        <div class="pack-card" data-pack-id="${pack.id}">
          <div class="pack-image" style="background: ${info.gradient}">
            <span class="pack-icon">${info.icon}</span>
          </div>
          <div class="pack-info">
            <div class="pack-name">${pack.name}</div>
            <div class="pack-desc">${pack.desc}</div>
            <div class="pack-details">
              <span>📇 ${pack.cardCount}张</span>
              <span>🎰 含兑换卡</span>
            </div>
            <div class="pack-price-row">
              ${pack.price.normal > 0 ? `<span class="price-tag">💰 ${pack.price.normal}</span>` : ''}
              ${pack.price.special > 0 ? `<span class="price-tag">💎 ${pack.price.special}</span>` : ''}
            </div>
          </div>
          <button class="btn btn-buy" data-pack="${pack.id}">购买</button>
        </div>
      `;
    }

    html += `
        </div>

        <div class="shop-section-title">🔄 兑换商店</div>
        <div class="exchange-section" id="exchange-section"></div>
      </div>
    `;

    shop.innerHTML = html;

    // 绑定购买事件
    shop.querySelectorAll('.btn-buy').forEach(btn => {
      btn.onclick = () => {
        const packId = btn.dataset.pack;
        this.showBuyDialog(packId);
      };
    });

    // 渲染兑换区
    this.renderExchangeSection();
  },

  renderExchangeSection() {
    const section = document.getElementById('exchange-section');
    if (!section) return;

    const state = Game.getState();
    let html = '';

    // 常驻兑换
    html += `<div class="exchange-group"><div class="exchange-group-title">常驻兑换</div><div class="exchange-grid">`;
    for (const item of EXCHANGE_CONFIG.permanent) {
      const canAfford = state.exchangeCards >= item.cost;
      const card = Game.getCardById(item.cardId);
      const rarityInfo = Game.getRarityInfo(card.rarity);
      html += `
        <div class="exchange-item">
          <div class="mini-card" style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}">
            <div class="mini-card-name">${item.name}</div>
            <div class="mini-card-rarity" style="color: ${rarityInfo.color}">${item.rarity}</div>
          </div>
          <div class="exchange-cost">🎟️ ${item.cost}</div>
          <button class="btn btn-exchange ${canAfford ? '' : 'disabled'}" 
                  data-card="${item.cardId}" data-cost="${item.cost}" ${canAfford ? '' : 'disabled'}>
            ${canAfford ? '兑换' : '数量不足'}
          </button>
        </div>
      `;
    }
    html += `</div></div>`;

    // 限时兑换
    html += `<div class="exchange-group"><div class="exchange-group-title">⏰ 限时兑换</div>`;
    for (const limited of EXCHANGE_CONFIG.limited) {
      const status = Game.getLimitedExchangeStatus(limited);
      html += `<div class="limited-banner ${status.active ? 'active' : ''}">`;
      html += `<div class="limited-status">${status.msg}</div>`;
      if (!limited.startTime) {
        html += `<button class="btn btn-small" onclick="UI.openLimitedExchange('${limited.id}')">开启限时兑换</button>`;
      }
      html += `</div>`;

      if (status.active || limited.startTime) {
        html += `<div class="exchange-grid">`;
        for (const item of limited.cards) {
          const canAfford = state.exchangeCards >= item.cost;
          const card = Game.getCardById(item.cardId);
          const rarityInfo = Game.getRarityInfo(card.rarity);
          html += `
            <div class="exchange-item">
              <div class="mini-card" style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}">
                <div class="mini-card-name">${item.name}</div>
                <div class="mini-card-rarity" style="color: ${rarityInfo.color}">${item.rarity}</div>
              </div>
              <div class="exchange-cost">🎟️ ${item.cost}</div>
              <button class="btn btn-exchange ${canAfford ? '' : 'disabled'}" 
                      data-card="${item.cardId}" data-cost="${item.cost}" ${canAfford || !status.active ? '' : 'disabled'} ${status.active ? '' : 'disabled'}>
                ${status.active ? (canAfford ? '兑换' : '数量不足') : '未开启'}
              </button>
            </div>
          `;
        }
        html += `</div>`;
      }
    }
    html += `</div>`;

    section.innerHTML = html;

    // 绑定兑换事件
    section.querySelectorAll('.btn-exchange').forEach(btn => {
      btn.onclick = () => {
        const cardId = btn.dataset.card;
        const cost = parseInt(btn.dataset.cost);
        this.doExchange(cardId, cost);
      };
    });
  },

  openLimitedExchange(limitedId) {
    Game.openLimitedExchange(limitedId);
    this.renderShop();
    this.showToast('限时兑换已开启！');
  },

  doExchange(cardId, cost) {
    const state = Game.getState();
    if (state.exchangeCards < cost) {
      this.showToast('兑换卡数量不足，无法兑换');
      return;
    }
    const result = Game.exchangeCard(cardId, cost);
    if (result.success) {
      this.showToast(`兑换成功！获得 ${result.card.name}`);
      this.renderShop();
      this.updateStatusBar();
    } else {
      this.showToast(result.msg);
    }
  },

  // ===================== 购买弹窗 =====================
  showBuyDialog(packId) {
    const pack = PACKS.find(p => p.id === packId);
    if (!pack) return;

    const currency = Game.getCurrency();
    const canBuyNormal = pack.price.normal > 0 && currency.normal >= pack.price.normal;
    const canBuySpecial = pack.price.special > 0 && currency.special >= pack.price.special;

    const dialog = this.createModal(`
      <div class="dialog buy-dialog">
        <h2>购买 ${pack.name}</h2>
        <div class="pack-details-expanded">
          <p>${pack.desc}</p>
          <p>包含 <strong>${pack.cardCount}</strong> 张卡牌</p>
          <p>可能含有兑换卡</p>
        </div>
        <div class="buy-options">
          ${pack.price.normal > 0 ? `
            <div class="buy-option ${canBuyNormal ? '' : 'disabled'}">
              <div class="buy-option-label">💰 普通货币</div>
              <div class="buy-option-price">${pack.price.normal}</div>
              <button class="btn btn-primary" id="buy-normal" ${canBuyNormal ? '' : 'disabled'}>
                ${canBuyNormal ? '购买' : '货币不足'}
              </button>
            </div>
          ` : ''}
          ${pack.price.special > 0 ? `
            <div class="buy-option ${canBuySpecial ? '' : 'disabled'}">
              <div class="buy-option-label">💎 特殊货币</div>
              <div class="buy-option-price">${pack.price.special}</div>
              <button class="btn btn-primary" id="buy-special" ${canBuySpecial ? '' : 'disabled'}>
                ${canBuySpecial ? '购买' : '货币不足'}
              </button>
            </div>
          ` : ''}
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="UI.closeModal()">取消</button>
        </div>
      </div>
    `);

    if (pack.price.normal > 0) {
      dialog.querySelector('#buy-normal').onclick = () => {
        const result = Game.buyPack(packId, 'normal');
        if (result.success) {
          this.showToast('购买成功！卡包已存入仓库');
          this.closeModal();
          this.updateStatusBar();
        } else {
          this.showToast(result.msg);
        }
      };
    }

    if (pack.price.special > 0) {
      dialog.querySelector('#buy-special').onclick = () => {
        const result = Game.buyPack(packId, 'special');
        if (result.success) {
          this.showToast('购买成功！卡包已存入仓库');
          this.closeModal();
          this.updateStatusBar();
        } else {
          this.showToast(result.msg);
        }
      };
    }
  },

  // ===================== 仓库 =====================
  renderWarehouse() {
    const state = Game.getState();
    const warehouse = document.getElementById('view-warehouse');

    if (state.packs.length === 0) {
      warehouse.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">仓库空空如也</div>
          <div class="empty-hint">前往商店购买卡包</div>
          <button class="btn btn-primary" onclick="UI.showView('shop')">前往商店</button>
        </div>
      `;
      return;
    }

    // 按卡包类型分组
    const grouped = {};
    for (const packInstance of state.packs) {
      const pack = PACKS.find(p => p.id === packInstance.packId);
      if (!grouped[packInstance.packId]) {
        grouped[packInstance.packId] = { pack, instances: [] };
      }
      grouped[packInstance.packId].instances.push(packInstance);
    }

    let html = `<div class="warehouse-container">`;
    for (const [packId, data] of Object.entries(grouped)) {
      const pack = data.pack;
      html += `
        <div class="warehouse-group">
          <div class="warehouse-group-title">
            ${pack.name} <span class="count-badge">×${data.instances.length}</span>
          </div>
          <div class="warehouse-items">
      `;
      for (const instance of data.instances) {
        html += `
          <div class="warehouse-pack-item" data-uid="${instance.uid}">
            <div class="pack-box-art" style="background: linear-gradient(135deg, ${Game.getRarityInfo('N').bg}, ${Game.getRarityInfo('SR').bg})">
              📦
            </div>
            <button class="btn btn-open-pack" data-uid="${instance.uid}">开启</button>
          </div>
        `;
      }
      html += `</div></div>`;
    }
    html += `</div>`;

    warehouse.innerHTML = html;

    // 绑定开启事件
    warehouse.querySelectorAll('.btn-open-pack').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.uid;
        this.openPackFlow(uid);
      };
    });
  },

  // ===================== 开包流程 =====================
  openPackFlow(packUid) {
    const state = Game.getState();
    const packInstance = state.packs.find(p => p.uid === packUid);
    if (!packInstance) return;

    const pack = PACKS.find(p => p.id === packInstance.packId);
    
    // 播放开包动画
    this.showPackOpeningAnimation(pack, () => {
      // 执行开包
      const result = Game.openPack(packInstance.packId);
      if (!result) {
        this.showToast('开包失败');
        return;
      }

      // 从仓库移除
      Game.removePackFromWarehouse(packUid);
      
      // 展示结果
      this.showPackResults(result);
    });
  },

  showPackOpeningAnimation(pack, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'pack-opening-overlay';
    overlay.innerHTML = `
      <div class="opening-animation">
        <div class="pack-shake">
          <div class="pack-box-large" style="background: linear-gradient(135deg, ${Game.getRarityInfo('SR').bg}, ${Game.getRarityInfo('SSR').bg})">
            <div class="pack-art">📦</div>
          </div>
        </div>
        <div class="opening-text">开启中...</div>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        callback();
      }, 300);
    }, 1500);
  },

  showPackResults(result) {
    const cards = result.cards;
    const exchangeCards = result.exchangeCards;
    
    // 九宫格展示
    const overlay = document.createElement('div');
    overlay.className = 'pack-result-overlay';
    overlay.id = 'pack-result-overlay';

    let html = `
      <div class="pack-result-container">
        <div class="result-header">
          <h2>🎉 开包结果</h2>
          ${exchangeCards > 0 ? `<div class="exchange-cards-notify">🎟️ 获得 ${exchangeCards} 张兑换卡</div>` : ''}
        </div>
        <div class="card-grid" id="card-grid">
    `;

    cards.forEach((card, idx) => {
      const rarityInfo = Game.getRarityInfo(card.rarity);
      const cardData = card.card;
      html += `
        <div class="card-in-grid" 
             data-idx="${idx}" 
             style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}; ${rarityInfo.glow ? '--rarity-glow: 1' : ''}">
          <div class="card-inner">
            <div class="card-rarity-badge">${card.rarity}</div>
            <div class="card-image">${this.getCardEmoji(cardData.rarity)}</div>
            <div class="card-name" style="color: ${rarityInfo.color}">${cardData.name}</div>
            <div class="card-star">${this.getStars(card.rarity)}</div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    html += `<div class="result-actions">
      <button class="btn btn-primary" id="confirm-results">确认入库</button>
    </div>`;
    html += `</div>`;

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // 绑定卡片点击事件 - 查看详情
    overlay.querySelectorAll('.card-in-grid').forEach(cardEl => {
      cardEl.onclick = () => {
        const idx = parseInt(cardEl.dataset.idx);
        this.showCardDetail(cards[idx], cards);
      };
    });

    overlay.querySelector('#confirm-results').onclick = () => {
      overlay.remove();
      this.showToast(`已获得 ${cards.length} 张卡牌`);
      this.updateStatusBar();
      this.renderWarehouse();
    };
  },

  // ===================== 卡片详情 =====================
  showCardDetail(cardData, allCards = null, currentIdx = null) {
    const card = cardData.card || cardData;
    const rarity = cardData.rarity || (cardData.card && cardData.card.rarity) || 'N';
    const rarityInfo = Game.getRarityInfo(rarity);
    
    const overlay = document.createElement('div');
    overlay.className = 'card-detail-overlay';
    overlay.id = 'card-detail-overlay';

    let navHtml = '';
    if (allCards && allCards.length > 1) {
      navHtml = `
        <button class="detail-nav prev" id="detail-prev">‹</button>
        <button class="detail-nav next" id="detail-next">›</button>
      `;
    }

    overlay.innerHTML = `
      <div class="card-detail-container" 
           style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}; ${rarityInfo.glow ? '--rarity-glow: 1' : ''}">
        <button class="close-btn" id="close-detail">✕</button>
        ${navHtml}
        <div class="detail-card">
          <div class="detail-rarity-badge">${rarityInfo.name}</div>
          <div class="detail-card-image">${this.getCardEmoji(rarity)}</div>
          <div class="detail-card-name" style="color: ${rarityInfo.color}">${card.name}</div>
          ${card.group ? `<div class="detail-card-group">${card.group}</div>` : ''}
          <div class="detail-card-stars">${this.getStars(rarity)}</div>
          ${card.style ? `<div class="detail-card-style">风格: ${STYLES[card.style]?.emoji || ''} ${STYLES[card.style]?.name || ''}</div>` : ''}
          <div class="detail-card-desc">${card.desc}</div>
          <div class="detail-card-attrs">
            <div class="attr-item"><span class="attr-label">💃 Dance</span><span class="attr-value">${card.dance || 0}</span></div>
            <div class="attr-item"><span class="attr-label">🎤 Vocal</span><span class="attr-value">${card.vocal || 0}</span></div>
            <div class="attr-item"><span class="attr-label">👀 Visual</span><span class="attr-value">${card.visual || 0}</span></div>
            <div class="attr-item"><span class="attr-label">🔥 Popularity</span><span class="attr-value">${card.popularity || 0}</span></div>
          </div>
          <div class="detail-card-stats">
            <span>品质: ${rarityInfo.name}</span>
            <span>售卖价: ${rarityInfo.sellPrice} 普通货币</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary" id="card-info-btn">查看信息</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#close-detail').onclick = () => {
      overlay.remove();
    };

    // 左右滑动切换
    if (allCards && currentIdx === null) {
      currentIdx = allCards.indexOf(cardData);
    }

    if (allCards && allCards.length > 1) {
      overlay.querySelector('#detail-prev').onclick = () => {
        let newIdx = (currentIdx - 1 + allCards.length) % allCards.length;
        overlay.remove();
        this.showCardDetail(allCards[newIdx], allCards, newIdx);
      };
      overlay.querySelector('#detail-next').onclick = () => {
        let newIdx = (currentIdx + 1) % allCards.length;
        overlay.remove();
        this.showCardDetail(allCards[newIdx], allCards, newIdx);
      };

      // 触摸滑动
      let touchStartX = 0;
      const detailContainer = overlay.querySelector('.card-detail-container');
      detailContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
      });
      detailContainer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            overlay.querySelector('#detail-prev').click();
          } else {
            overlay.querySelector('#detail-next').click();
          }
        }
      });

      // 鼠标拖拽支持
      let mouseStartX = 0;
      let isDown = false;
      detailContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        mouseStartX = e.clientX;
      });
      detailContainer.addEventListener('mouseup', (e) => {
        if (!isDown) return;
        isDown = false;
        const diff = e.clientX - mouseStartX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            overlay.querySelector('#detail-prev').click();
          } else {
            overlay.querySelector('#detail-next').click();
          }
        }
      });
    }

    // 查看信息
    overlay.querySelector('#card-info-btn').onclick = () => {
      this.showCardInfo(card);
    };
  },

  showCardInfo(card) {
    const infoDialog = this.createModal(`
      <div class="dialog card-info-dialog">
        <h3>📋 卡牌信息</h3>
        <div class="info-content">
          <div class="info-item"><span class="info-label">名称:</span> ${card.name}</div>
          <div class="info-item"><span class="info-label">品质:</span> ${Game.getRarityInfo(card.rarity).name}</div>
          <div class="info-item"><span class="info-label">编号:</span> ${card.id}</div>
          <div class="info-item info-desc"><span class="info-label">描述:</span> ${card.desc}</div>
          <div class="info-item"><span class="info-label">售卖价:</span> ${Game.getRarityInfo(card.rarity).sellPrice} 普通货币</div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-primary" onclick="UI.closeModal()">确定</button>
        </div>
      </div>
    `);
  },

  // ===================== 图鉴 =====================
  renderCollection() {
    const state = Game.getState();
    const collection = document.getElementById('view-collection');

    const collectedIds = Object.keys(state.collection);
    const totalCards = CARDS.length;
    const collectedCount = collectedIds.length;
    const progress = Math.round((collectedCount / totalCards) * 100);

    let html = `
      <div class="collection-container">
        <div class="collection-progress">
          <div class="progress-circle" style="--progress: ${progress}">
            <div class="progress-value">${progress}%</div>
            <div class="progress-label">${collectedCount}/${totalCards}</div>
          </div>
        </div>
    `;

    // 按品质分组
    const rarityOrder = ['UR', 'SSR', 'SR', 'R', 'N'];
    for (const rarity of rarityOrder) {
      const rarityInfo = Game.getRarityInfo(rarity);
      const cardsOfRarity = CARDS.filter(c => c.rarity === rarity);
      const collectedOfRarity = cardsOfRarity.filter(c => state.collection[c.id]);
      
      html += `
        <div class="collection-group">
          <div class="collection-group-title" style="color: ${rarityInfo.color}">
            ${rarityInfo.name} (${collectedOfRarity.length}/${cardsOfRarity.length})
          </div>
          <div class="collection-grid">
      `;

      for (const card of cardsOfRarity) {
        const owned = state.collection[card.id];
        html += `
          <div class="collection-card ${owned ? 'owned' : 'locked'}" 
               ${owned ? `data-card-id="${card.id}"` : ''}
               style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}; ${rarityInfo.glow ? '--rarity-glow: 1' : ''}">
            <div class="collection-card-inner">
              ${owned ? `
                <div class="cc-image">${this.getCardEmoji(card.rarity)}</div>
                <div class="cc-name" style="color: ${rarityInfo.color}">${card.name}</div>
                ${owned > 1 ? `<div class="cc-count">×${owned}</div>` : ''}
              ` : `
                <div class="cc-locked">🔒</div>
                <div class="cc-name locked-name">???</div>
              `}
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    html += `</div>`;
    collection.innerHTML = html;

    // 绑定点击事件
    collection.querySelectorAll('.collection-card.owned').forEach(el => {
      el.onclick = () => {
        const cardId = el.dataset.cardId;
        const card = Game.getCardById(cardId);
        const instance = { card, rarity: card.rarity };
        this.showCardDetail(instance);
      };
    });
  },

  // ===================== 背包 =====================
  renderInventory() {
    const state = Game.getState();
    const inventory = document.getElementById('view-inventory');
    const cards = Game.getInventoryCards();

    // 按品质排序
    const rarityOrder = { UR: 0, SSR: 1, SR: 2, R: 3, N: 4 };
    cards.sort((a, b) => {
      const r = rarityOrder[a.card.rarity] - rarityOrder[b.card.rarity];
      if (r !== 0) return r;
      return b.timestamp - a.timestamp;
    });

    if (cards.length === 0) {
      inventory.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">背包空空如也</div>
          <div class="empty-hint">开启卡包获得卡牌</div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="inventory-container">
        <div class="inventory-header">
          <div class="inventory-count">共 ${cards.length} 张卡牌</div>
          ${this.sellMode ? `
            <button class="btn btn-danger" id="confirm-sell">确认出售 (${this.selectedCards.length})</button>
            <button class="btn btn-secondary" id="cancel-sell">取消</button>
          ` : `
            <button class="btn btn-outline" id="enter-sell">出售</button>
          `}
        </div>
        <div class="inventory-grid">
    `;

    for (const instance of cards) {
      const card = instance.card;
      const rarityInfo = Game.getRarityInfo(card.rarity);
      const selected = this.selectedCards.includes(instance.uid);

      html += `
        <div class="inventory-card ${selected ? 'selected' : ''} ${this.sellMode ? 'sell-mode' : ''}"
             data-uid="${instance.uid}"
             style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}; ${rarityInfo.glow ? '--rarity-glow: 1' : ''}">
          ${this.sellMode ? `<div class="sell-checkbox ${selected ? 'checked' : ''}">${selected ? '✓' : ''}</div>` : ''}
          <div class="inv-card-inner">
            <div class="inv-rarity-badge">${card.rarity}</div>
            <div class="inv-card-image">${this.getCardEmoji(card.rarity)}</div>
            <div class="inv-card-name" style="color: ${rarityInfo.color}">${card.name}</div>
          </div>
        </div>
      `;
    }

    html += `</div></div>`;
    inventory.innerHTML = html;

    // 绑定事件
    inventory.querySelectorAll('.inventory-card').forEach(el => {
      el.onclick = () => {
        const uid = el.dataset.uid;
        if (this.sellMode) {
          this.toggleSellSelection(uid);
        } else {
          const instance = cards.find(c => c.uid === uid);
          if (instance) {
            this.showCardDetail(instance);
          }
        }
      };
    });

    const enterSellBtn = inventory.querySelector('#enter-sell');
    if (enterSellBtn) {
      enterSellBtn.onclick = () => {
        this.sellMode = true;
        this.selectedCards = [];
        this.renderInventory();
      };
    }

    const cancelSellBtn = inventory.querySelector('#cancel-sell');
    if (cancelSellBtn) {
      cancelSellBtn.onclick = () => {
        this.sellMode = false;
        this.selectedCards = [];
        this.renderInventory();
      };
    }

    const confirmSellBtn = inventory.querySelector('#confirm-sell');
    if (confirmSellBtn) {
      confirmSellBtn.onclick = () => {
        if (this.selectedCards.length === 0) {
          this.showToast('请至少选择一张卡牌');
          return;
        }
        this.showSellConfirmDialog();
      };
    }
  },

  toggleSellSelection(uid) {
    const idx = this.selectedCards.indexOf(uid);
    if (idx >= 0) {
      this.selectedCards.splice(idx, 1);
    } else {
      this.selectedCards.push(uid);
    }
    this.renderInventory();
  },

  showSellConfirmDialog() {
    const cards = Game.getInventoryCards();
    let totalPrice = 0;
    const rarities = {};

    for (const uid of this.selectedCards) {
      const instance = cards.find(c => c.uid === uid);
      if (instance) {
        const rarityInfo = Game.getRarityInfo(instance.card.rarity);
        totalPrice += rarityInfo.sellPrice;
        rarities[instance.card.rarity] = (rarities[instance.card.rarity] || 0) + 1;
      }
    }

    const dialog = this.createModal(`
      <div class="dialog sell-confirm-dialog">
        <h2>确认出售</h2>
        <div class="sell-summary">
          <p>出售数量: <strong>${this.selectedCards.length}</strong> 张</p>
          <p>获得货币: <strong>💰 ${totalPrice}</strong></p>
          <div class="sell-rarity-breakdown">
            ${Object.entries(rarities).map(([r, c]) => {
              const info = Game.getRarityInfo(r);
              return `<span style="color: ${info.color}">${info.name}×${c}</span>`;
            }).join(', ')}
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-danger" id="confirm-sell-yes">确认出售</button>
          <button class="btn btn-secondary" onclick="UI.closeModal()">取消</button>
        </div>
      </div>
    `);

    dialog.querySelector('#confirm-sell-yes').onclick = () => {
      const result = Game.sellCards(this.selectedCards);
      if (result.success) {
        this.showToast(`出售成功！获得 ${result.totalNormal} 普通货币`);
        this.selectedCards = [];
        this.sellMode = false;
        this.closeModal();
        this.updateStatusBar();
        this.renderInventory();
      }
    };
  },

  // ===================== 小游戏 =====================
  showMiniGameDialog() {
    const dialog = this.createModal(`
      <div class="dialog minigame-dialog">
        <h2>🎮 比大小游戏</h2>
        <div class="minigame-desc">
          <p>规则：你和系统各抽一张牌(1-10)，你的牌比系统大就赢！</p>
          <ul>
            <li>赢: 获得 30-100 普通货币</li>
            <li>平局: 获得 20 普通货币</li>
            <li>输: 不扣钱</li>
            <li>有10%概率获得3倍奖励和2特殊货币</li>
          </ul>
        </div>
        <div class="minigame-area">
          <div class="mg-row">
            <div class="mg-label">你的牌:</div>
            <div class="mg-card" id="user-card">?</div>
          </div>
          <div class="mg-vs">VS</div>
          <div class="mg-row">
            <div class="mg-label">系统的牌:</div>
            <div class="mg-card" id="system-card">?</div>
          </div>
        </div>
        <div class="minigame-result" id="mg-result"></div>
        <div class="dialog-actions">
          <button class="btn btn-primary" id="play-mg">抽牌</button>
          <button class="btn btn-secondary" onclick="UI.closeModal()">关闭</button>
        </div>
      </div>
    `);

    dialog.querySelector('#play-mg').onclick = () => {
      const result = Game.playCompareGame();
      const userCard = dialog.querySelector('#user-card');
      const systemCard = dialog.querySelector('#system-card');
      const resultEl = dialog.querySelector('#mg-result');
      const playBtn = dialog.querySelector('#play-mg');

      userCard.style.animation = 'none';
      systemCard.style.animation = 'none';
      setTimeout(() => {
        userCard.style.animation = 'flipIn 0.6s ease';
        systemCard.style.animation = 'flipIn 0.6s ease';
      }, 10);

      userCard.textContent = result.user;
      systemCard.textContent = result.systemCard;

      let resultText = '';
      let resultClass = '';
      if (result.result === 'win') {
        resultText = `🎉 赢了！获得 ${result.reward} 普通货币`;
        resultClass = 'win';
      } else if (result.result === 'lose') {
        resultText = '😢 输了，下次再来！';
        resultClass = 'lose';
      } else {
        resultText = `🤝 平局！获得 ${result.reward} 普通货币`;
        resultClass = 'draw';
      }

      resultEl.innerHTML = resultText;
      resultEl.className = `minigame-result ${resultClass}`;

      playBtn.textContent = '再玩一次';
      this.updateStatusBar();
    };
  },

  // ===================== 充值 =====================
  showRechargeDialog() {
    const dialog = this.createModal(`
      <div class="dialog recharge-dialog">
        <h2>💳 充值中心</h2>
        <p class="recharge-notice">⚠️ 此为演示版本，点击即可获得货币</p>
        <div class="recharge-grid">
          ${RECHARGE_OPTIONS.map(opt => `
            <div class="recharge-item" data-id="${opt.id}">
              <div class="recharge-icon">${opt.icon}</div>
              <div class="recharge-desc">${opt.desc}</div>
              <div class="recharge-price">¥${opt.price}</div>
              <button class="btn btn-primary btn-recharge" data-id="${opt.id}">充值</button>
            </div>
          `).join('')}
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="UI.closeModal()">关闭</button>
        </div>
      </div>
    `);

    dialog.querySelectorAll('.btn-recharge').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const opt = RECHARGE_OPTIONS.find(o => o.id === id);
        if (opt) {
          Game.addCurrency(opt.normal, opt.special);
          this.showToast(`充值成功！获得 ${opt.desc}`);
          this.updateStatusBar();
        }
      };
    });
  },

  // ===================== 系统礼包 =====================
  showSystemGiftDialog() {
    const gifts = Game.checkAndClaimSystemGifts();
    const state = Game.getState();
    const today = Game.getTodayDateStr();
    const claimed = state.systemGiftClaimed.filter(c => c.date === today);
    const claimedTypes = claimed.map(c => c.type);

    let html = `
      <div class="dialog gift-dialog">
        <h2>🎁 系统礼包</h2>
        <p class="gift-notice">在指定时间(12:00和20:00)可领取每日礼包</p>
        <div class="gift-list">
    `;

    for (const gift of SYSTEM_GIFTS) {
      const claimed = claimedTypes.includes(gift.desc);
      html += `
        <div class="gift-item ${claimed ? 'claimed' : ''}">
          <div class="gift-time">⏰ ${String(gift.hour).padStart(2, '0')}:${String(gift.minute).padStart(2, '0')}</div>
          <div class="gift-desc">${gift.desc}</div>
          <div class="gift-reward">💰 ${gift.normal} / 💎 ${gift.special}</div>
          <button class="btn ${claimed ? 'btn-disabled' : 'btn-primary'} gift-claim" 
                  data-desc="${gift.desc}" ${claimed ? 'disabled' : ''}>
            ${claimed ? '已领取' : '领取'}
          </button>
        </div>
      `;
    }

    html += `</div><div class="dialog-actions"><button class="btn btn-secondary" onclick="UI.closeModal()">关闭</button></div></div>`;

    const dialog = this.createModal(html);

    dialog.querySelectorAll('.gift-claim').forEach(btn => {
      btn.onclick = () => {
        const desc = btn.dataset.desc;
        const result = Game.claimSystemGift(desc);
        if (result.success) {
          this.showToast(`领取成功！获得 ${result.gift.normal}普通 + ${result.gift.special}特殊`);
          this.closeModal();
          this.showSystemGiftDialog();
          this.updateStatusBar();
        } else {
          this.showToast(result.msg);
        }
      };
    });
  },

  // ===================== 收集奖励 =====================
  showCollectionRewardDialog() {
    const rewards = Game.checkCollectionRewards();
    const state = Game.getState();

    let html = `
      <div class="dialog collection-reward-dialog">
        <h2>🏆 收集奖励</h2>
        <p>当前收集进度: ${Object.keys(state.collection).length} / ${CARDS.length}</p>
        <div class="reward-list">
    `;

    const claimed = state.systemGiftClaimed.filter(c => c.type.startsWith('collection_'));
    const claimedThresholds = claimed.map(c => parseInt(c.type.replace('collection_', '')));

    for (const reward of COLLECTION_REWARDS) {
      const available = Object.keys(state.collection).length >= reward.threshold;
      const alreadyClaimed = claimedThresholds.includes(reward.threshold);

      html += `
        <div class="reward-item ${alreadyClaimed ? 'claimed' : available ? 'available' : ''}">
          <div class="reward-threshold">${reward.threshold}种卡牌</div>
          <div class="reward-desc">${reward.desc}</div>
          <div class="reward-reward">💰 ${reward.reward.normal} / 💎 ${reward.reward.special}</div>
          <button class="btn ${alreadyClaimed ? 'btn-disabled' : available ? 'btn-primary' : 'btn-disabled'} reward-claim" 
                  data-threshold="${reward.threshold}" ${alreadyClaimed || !available ? 'disabled' : ''}>
            ${alreadyClaimed ? '已领取' : available ? '领取' : '未达成'}
          </button>
        </div>
      `;
    }

    html += `</div><div class="dialog-actions"><button class="btn btn-secondary" onclick="UI.closeModal()">关闭</button></div></div>`;

    const dialog = this.createModal(html);

    dialog.querySelectorAll('.reward-claim').forEach(btn => {
      btn.onclick = () => {
        const threshold = parseInt(btn.dataset.threshold);
        const result = Game.claimCollectionReward(threshold);
        if (result.success) {
          this.showToast(`领取成功！获得 ${result.reward.reward.normal}普通 + ${result.reward.reward.special}特殊`);
          this.closeModal();
          this.showCollectionRewardDialog();
          this.updateStatusBar();
        } else {
          this.showToast(result.msg);
        }
      };
    });
  },

  // ===================== 兑换视图 =====================
  showExchangeView() {
    this.showView('shop');
  },

  // ===================== 系统检测 =====================
  checkSystemGifts() {
    const gifts = Game.checkAndClaimSystemGifts();
    if (gifts.length > 0) {
      this.showToast(`💡 有 ${gifts.length} 个系统礼包可领取`);
    }
  },

  checkCollectionRewards() {
    // 静默检查，不弹窗
  },

  // ===================== K-POP PK 战斗系统 UI =====================
  startPKFlow() {
    const inventory = Game.getInventoryCardsWithStats();
    if (inventory.length < 3) {
      this.showToast('背包卡牌不足！至少需要3张卡牌');
      return;
    }
    this.currentRegression = Game.startRegression();
    this.pkSelectedCards = [];
    this.selectedAlbum = null;
    this.showAlbumSelection();
  },

  showAlbumSelection() {
    const reg = this.currentRegression;
    const overlay = document.createElement('div');
    overlay.className = 'pk-overlay';
    overlay.id = 'pk-overlay';

    let albumsHtml = '';
    reg.albumOptions.forEach((album, idx) => {
      const scaleIcon = album.scale === 'solo' ? '🎤' : album.scale === 'mini' ? '💿' : '🎼';
      albumsHtml += `
        <div class="pk-album-option" data-album-idx="${idx}">
          <div class="pk-album-icon">${scaleIcon}</div>
          <div class="pk-album-info">
            <div class="pk-album-scale">${album.scaleName}</div>
            <div class="pk-album-style">${album.styleEmoji} ${album.styleName}</div>
            <div class="pk-album-count">需要 ${album.cardCount} 张卡牌</div>
          </div>
          <div class="pk-album-arrow">→</div>
        </div>
      `;
    });

    overlay.innerHTML = `
      <div class="pk-container">
        <div class="pk-header">
          <h2>🏆 回归 PK</h2>
          <button class="btn-close-pk" id="close-pk">✕</button>
        </div>
        <div class="pk-theme-info">
          <div class="theme-label">本次主题</div>
          <div class="theme-value">${reg.themeEmoji} ${reg.themeName}回归</div>
          <div class="theme-hint">选择一个专辑开始PK挑战，风格越匹配加成越高！</div>
        </div>
        <div class="pk-album-options">${albumsHtml}</div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#close-pk').onclick = () => overlay.remove();

    overlay.querySelectorAll('.pk-album-option').forEach(opt => {
      opt.onclick = () => {
        const idx = parseInt(opt.dataset.albumIdx);
        this.selectedAlbum = reg.albumOptions[idx];
        overlay.remove();
        this.showPKCardPicker();
      };
    });
  },

  showPKCardPicker() {
    const reg = this.currentRegression;
    const album = this.selectedAlbum;
    const inventory = Game.getInventoryCardsWithStats();
    const currentSelected = this.pkSelectedCards || [];
    const selectedUids = currentSelected.map(c => c.uid);
    const themeStyle = reg.themeStyle;

    // 过滤掉已使用的卡牌
    const availableInventory = inventory.filter(c => !reg.usedCardUids.has(c.uid));

    // 按整体主题风格的加成排序
    const sortedInventory = availableInventory.map(c => ({
      ...c,
      bonus: Game.calcStyleBonus(c.style, themeStyle)
    })).sort((a, b) => b.bonus - a.bonus);

    const dialog = this.createModal(`
      <div class="dialog pk-picker-dialog">
        <h3>选择卡牌 - ${album.scaleName}</h3>
        <div class="pk-picker-info">
          本次主题: ${reg.themeEmoji} ${reg.themeName} | 专辑: ${album.styleEmoji} ${album.styleName} | 需要 ${album.cardCount} 张 | 已选 ${currentSelected.length} 张
        </div>
        <div class="pk-picker-grid">
          ${sortedInventory.map(card => {
            const rarityInfo = Game.getRarityInfo(card.card.rarity);
            const isSelected = selectedUids.includes(card.uid);
            const bonusPct = Math.round((card.bonus - 0.7) * 100);
            return `
              <div class="pk-picker-card ${isSelected ? 'selected' : ''} ${card.bonus >= 1.15 ? 'high-bonus' : card.bonus >= 0.95 ? 'mid-bonus' : ''}"
                   data-uid="${card.uid}"
                   style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}">
                <div class="pkp-rarity">${card.card.rarity}</div>
                <div class="pkp-name">${card.card.name}</div>
                <div class="pkp-group">${card.card.group || ''}</div>
                <div class="pkp-stats">
                  💃${card.dance} 🎤${card.vocal}<br>
                  👀${card.visual} 🔥${card.popularity}
                </div>
                <div class="pkp-bonus ${bonusPct >= 15 ? 'high' : bonusPct >= 5 ? 'mid' : 'low'}">
                  ${bonusPct >= 0 ? '+' : ''}${bonusPct}%
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" id="cancel-pick">取消</button>
          <button class="btn btn-primary" id="confirm-pick" ${currentSelected.length !== album.cardCount ? 'disabled' : ''}>
            确认选择 (${currentSelected.length}/${album.cardCount})
          </button>
        </div>
      </div>
    `);

    dialog.querySelectorAll('.pk-picker-card').forEach(el => {
      el.onclick = () => {
        const uid = el.dataset.uid;
        const inCurrent = currentSelected.find(c => c.uid === uid);
        if (inCurrent) {
          this.pkSelectedCards = currentSelected.filter(c => c.uid !== uid);
        } else {
          if (currentSelected.length >= album.cardCount) {
            this.showToast(`最多选择${album.cardCount}张卡牌`);
            return;
          }
          const cardData = inventory.find(c => c.uid === uid);
          if (cardData) {
            this.pkSelectedCards = [...currentSelected, cardData];
          }
        }
        this.closeModal();
        this.showPKCardPicker();
      };
    });

    dialog.querySelector('#cancel-pick').onclick = () => {
      this.closeModal();
      // 返回专辑选择
      const pkOverlay = document.getElementById('pk-overlay');
      if (pkOverlay) pkOverlay.remove();
      this.showAlbumSelection();
    };

    dialog.querySelector('#confirm-pick').onclick = () => {
      if (this.pkSelectedCards.length !== album.cardCount) {
        this.showToast(`需要选择${album.cardCount}张卡牌`);
        return;
      }
      this.closeModal();
      this.showBattleInfo();
    };
  },

  showBattleInfo() {
    const reg = this.currentRegression;
    const album = this.selectedAlbum;
    const playerCards = this.pkSelectedCards;

    // 关闭PK选择界面
    const pkOverlay = document.getElementById('pk-overlay');
    if (pkOverlay) pkOverlay.remove();

    // 执行战斗
    const result = Game.submitBattle(reg, album, playerCards);
    if (!result.success) {
      this.showToast(result.msg);
      return;
    }

    const battle = result.battle;
    const overlay = document.createElement('div');
    overlay.className = 'pk-battle-info-overlay';

    const playerCardsHtml = battle.playerCards.map((c, i) => {
      const cardData = c.card || c;
      const name = c.card ? c.card.name : c.name;
      const rarity = c.card ? c.card.rarity : c.rarity;
      const group = c.card ? (c.card.group || '') : '';
      const rarityInfo = Game.getRarityInfo(rarity);
      return `
        <div class="battle-info-card player-card-loading" data-card-idx="${i}" style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}">
          <div class="bic-rarity">${rarity}</div>
          <div class="bic-avatar">${name.charAt(0)}</div>
          <div class="bic-name">${name}</div>
          <div class="bic-group">${group}</div>
          <div class="bic-stats">
            <span class="stat-item">💃${c.dance}</span>
            <span class="stat-item">🎤${c.vocal}</span>
            <span class="stat-item">👀${c.visual}</span>
            <span class="stat-item">🔥${c.popularity}</span>
          </div>
        </div>
      `;
    }).join('');

    const enemyCardsHtml = battle.enemyCards.map((c, i) => {
      const rarityInfo = Game.getRarityInfo(c.rarity);
      const group = c.group || '';
      return `
        <div class="battle-info-card enemy-card-loading" data-card-idx="${i}" style="--rarity-color: ${rarityInfo.color}; --rarity-bg: ${rarityInfo.bg}">
          <div class="bic-rarity">${c.rarity}</div>
          <div class="bic-avatar">${c.name.charAt(0)}</div>
          <div class="bic-name">${c.name}</div>
          <div class="bic-group">${group}</div>
          <div class="bic-stats">
            <span class="stat-item">💃${c.dance}</span>
            <span class="stat-item">🎤${c.vocal}</span>
            <span class="stat-item">👀${c.visual}</span>
            <span class="stat-item">🔥${c.popularity}</span>
          </div>
        </div>
      `;
    }).join('');

    // 计算各项分数进度条比例
    const maxBroadcast = Math.max(battle.playerScores.broadcast, battle.enemyScores.broadcast, 1);
    const maxVote = Math.max(battle.playerScores.vote, battle.enemyScores.vote, 1);
    const maxStyle = Math.max(battle.playerScores.style, battle.enemyScores.style, 1);
    const maxTotal = Math.max(battle.playerScores.total, battle.enemyScores.total, 1);
    
    const winProb = battle.playerWinProb;
    const loseProb = 100 - winProb;

    overlay.innerHTML = `
      <div class="battle-info-container">
        <div class="bi-header">
          <h2>⚔️ 对战信息</h2>
          <div class="bi-close" id="bi-close">✕</div>
        </div>

        <div class="bi-album-info">
          <div class="bi-album-type">${album.scaleName}</div>
          <div class="bi-album-style">${album.styleEmoji} ${album.styleName}</div>
          <div class="bi-theme">主题: ${reg.themeEmoji} ${reg.themeName}</div>
        </div>

        <div class="bi-cards-section-v2">
          <div class="bi-team bi-team-v2 player-team">
            <div class="bi-team-header player-header">🔵 我方成员</div>
            <div class="bi-team-cards-v2">${playerCardsHtml}</div>
          </div>

          <div class="bi-vs-v2">
            <div class="vs-circle">VS</div>
          </div>

          <div class="bi-team bi-team-v2 enemy-team">
            <div class="bi-team-header enemy-header">🔴 电脑成员</div>
            <div class="bi-team-cards-v2">${enemyCardsHtml}</div>
          </div>
        </div>

        <div class="bi-scores-section" id="bi-scores">
          <div class="bi-score-row">
            <div class="bi-score-label-row">
              <span></span>
              <span class="label-center">🎤 放送分</span>
              <span></span>
            </div>
            <div class="bi-bars-h">
              <div class="bi-bar-h player-bar-h" data-target="${(battle.playerScores.broadcast / maxBroadcast) * 100}" data-value="${battle.playerScores.broadcast}">
                <span class="bar-label">${battle.playerScores.broadcast}</span>
              </div>
              <div class="bi-bar-h enemy-bar-h" data-target="${(battle.enemyScores.broadcast / maxBroadcast) * 100}" data-value="${battle.enemyScores.broadcast}">
                <span class="bar-label">${battle.enemyScores.broadcast}</span>
              </div>
            </div>
          </div>

          <div class="bi-score-row">
            <div class="bi-score-label-row">
              <span></span>
              <span class="label-center">🗳️ 投票分</span>
              <span></span>
            </div>
            <div class="bi-bars-h">
              <div class="bi-bar-h player-bar-h" data-target="${(battle.playerScores.vote / maxVote) * 100}" data-value="${battle.playerScores.vote}">
                <span class="bar-label">${battle.playerScores.vote}</span>
              </div>
              <div class="bi-bar-h enemy-bar-h" data-target="${(battle.enemyScores.vote / maxVote) * 100}" data-value="${battle.enemyScores.vote}">
                <span class="bar-label">${battle.enemyScores.vote}</span>
              </div>
            </div>
          </div>

          <div class="bi-score-row">
            <div class="bi-score-label-row">
              <span></span>
              <span class="label-center">🎵 风格分</span>
              <span></span>
            </div>
            <div class="bi-bars-h">
              <div class="bi-bar-h player-bar-h" data-target="${(battle.playerScores.style / maxStyle) * 100}" data-value="${battle.playerScores.style}">
                <span class="bar-label">${battle.playerScores.style}</span>
              </div>
              <div class="bi-bar-h enemy-bar-h" data-target="${(battle.enemyScores.style / maxStyle) * 100}" data-value="${battle.enemyScores.style}">
                <span class="bar-label">${battle.enemyScores.style}</span>
              </div>
            </div>
          </div>

          <div class="bi-total-section" id="bi-total">
            <div class="bi-score-label-row total-label-row">
              <span></span>
              <span class="label-center">📊 总分</span>
              <span></span>
            </div>
            <div class="bi-total-bars-h">
              <div class="bi-total-bar-h player-total-h" data-target="${(battle.playerScores.total / maxTotal) * 100}" data-value="${battle.playerScores.total}">
                <span class="bar-label">${battle.playerScores.total}</span>
              </div>
              <div class="bi-total-bar-h enemy-total-h" data-target="${(battle.enemyScores.total / maxTotal) * 100}" data-value="${battle.enemyScores.total}">
                <span class="bar-label">${battle.enemyScores.total}</span>
              </div>
            </div>
          </div>

          <div class="bi-prob-section" id="bi-prob" style="opacity: 0;">
            <div class="bi-prob-label">获胜概率</div>
            <div class="bi-prob-bar-container">
              <div class="bi-prob-bar-win" data-target="${winProb}">
                <span>${winProb.toFixed(1)}%</span>
              </div>
              <div class="bi-prob-bar-lose" data-target="${loseProb}">
                <span>${loseProb.toFixed(1)}%</span>
              </div>
            </div>
            <div class="bi-prob-labels">
              <span class="win-label">我方 ${winProb.toFixed(1)}%</span>
              <span class="lose-label">电脑 ${loseProb.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div class="bi-actions">
          <button class="btn btn-primary" id="btn-settle" style="opacity: 0.5; pointer-events: none;">结算本次回归 →</button>
          <button class="btn btn-secondary" id="btn-cancel" style="opacity: 0.5; pointer-events: none;">重新选择</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#bi-close').onclick = () => overlay.remove();

    // 执行动画顺序
    const cardCount = Math.max(battle.playerCards.length, battle.enemyCards.length);
    const totalCardLoadDelay = 300 + cardCount * 200; // 每张卡200ms，加上初始300ms
    
    // 卡牌装载动画
    setTimeout(() => {
      const playerCardsEl = overlay.querySelectorAll('.player-card-loading');
      const enemyCardsEl = overlay.querySelectorAll('.enemy-card-loading');
      
      playerCardsEl.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('card-loaded');
          card.classList.remove('player-card-loading');
          // 添加闪边特效
          card.style.animation = `cardGlowPulse 1s ease-out ${i * 0.1}s 1`;
        }, i * 150);
      });
      
      enemyCardsEl.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add('card-loaded-enemy');
          card.classList.remove('enemy-card-loading');
          card.style.animation = `cardGlowPulse 1s ease-out ${i * 0.1}s 1`;
        }, i * 150);
      });
    }, 200);

    // 分数条动画（卡牌装载完成后）
    const scoreStartDelay = totalCardLoadDelay + 300;
    setTimeout(() => {
      this.animateScoreBars(overlay);
    }, scoreStartDelay);

    // 总分条动画
    setTimeout(() => {
      this.animateTotalBars(overlay);
    }, scoreStartDelay + 1200);

    // 概率条动画 + 启用按钮
    const probStartDelay = scoreStartDelay + 1800;
    setTimeout(() => {
      const probSection = overlay.querySelector('#bi-prob');
      probSection.style.transition = 'opacity 0.5s ease';
      probSection.style.opacity = '1';
      
      setTimeout(() => {
        this.animateProbBars(overlay);
      }, 300);
      
      // 启用按钮
      setTimeout(() => {
        const settleBtn = overlay.querySelector('#btn-settle');
        const cancelBtn = overlay.querySelector('#btn-cancel');
        settleBtn.style.opacity = '1';
        settleBtn.style.pointerEvents = 'auto';
        cancelBtn.style.opacity = '1';
        cancelBtn.style.pointerEvents = 'auto';
        
        settleBtn.onclick = () => {
          overlay.remove();
          const winProbVal = battle.playerWinProb / 100;
          this.show12RoundSettlement(winProbVal);
        };

        cancelBtn.onclick = () => {
          overlay.remove();
          this.pkSelectedCards = [];
          this.showPKCardPicker();
        };
      }, 1500);
    }, probStartDelay);
  },

  // 分数条从0到目标值动画
  animateScoreBars(container) {
    const playerBars = container.querySelectorAll('.player-bar-h');
    const enemyBars = container.querySelectorAll('.enemy-bar-h');
    const duration = 800;
    const startTime = performance.now();

    playerBars.forEach((bar, idx) => {
      const targetPct = parseFloat(bar.dataset.target);
      const targetVal = parseInt(bar.dataset.value);
      const label = bar.querySelector('.bar-label');
      
      bar.style.width = '0%';
      label.textContent = '0';
      
      setTimeout(() => {
        requestAnimationFrame(function animate(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          bar.style.width = (easeProgress * targetPct) + '%';
          label.textContent = Math.round(easeProgress * targetVal);
          
          if (progress < 1) requestAnimationFrame(animate);
          else label.textContent = targetVal;
        });
      }, idx * 150);
    });

    enemyBars.forEach((bar, idx) => {
      const targetPct = parseFloat(bar.dataset.target);
      const targetVal = parseInt(bar.dataset.value);
      const label = bar.querySelector('.bar-label');
      
      bar.style.width = '0%';
      label.textContent = '0';
      
      setTimeout(() => {
        requestAnimationFrame(function animate(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          
          bar.style.width = (easeProgress * targetPct) + '%';
          label.textContent = Math.round(easeProgress * targetVal);
          
          if (progress < 1) requestAnimationFrame(animate);
          else label.textContent = targetVal;
        });
      }, idx * 150);
    });
  },

  // 总分条动画
  animateTotalBars(container) {
    const playerBar = container.querySelector('.player-total-h');
    const enemyBar = container.querySelector('.enemy-total-h');
    const duration = 1000;
    const startTime = performance.now();

    const animateBar = (bar) => {
      const targetPct = parseFloat(bar.dataset.target);
      const targetVal = parseInt(bar.dataset.value);
      const label = bar.querySelector('.bar-label');
      
      bar.style.width = '0%';
      label.textContent = '0';
      
      requestAnimationFrame(function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        
        bar.style.width = (easeProgress * targetPct) + '%';
        label.textContent = Math.round(easeProgress * targetVal);
        
        if (progress < 1) requestAnimationFrame(animate);
        else label.textContent = targetVal;
      });
    };

    animateBar(playerBar);
    animateBar(enemyBar);
  },

  // 概率条从两端上涨动画
  animateProbBars(container) {
    const winBar = container.querySelector('.bi-prob-bar-win');
    const loseBar = container.querySelector('.bi-prob-bar-lose');
    const winLabel = winBar.querySelector('span');
    const loseLabel = loseBar.querySelector('span');
    
    const winTarget = parseFloat(winBar.dataset.target);
    const loseTarget = parseFloat(loseBar.dataset.target);
    const duration = 1200;
    const startTime = performance.now();

    winBar.style.width = '0%';
    loseBar.style.width = '0%';
    winLabel.textContent = '0.0%';
    loseLabel.textContent = '0.0%';

    requestAnimationFrame(function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      winBar.style.width = (easeProgress * winTarget) + '%';
      loseBar.style.width = (easeProgress * loseTarget) + '%';
      winLabel.textContent = (easeProgress * winTarget).toFixed(1) + '%';
      loseLabel.textContent = (easeProgress * loseTarget).toFixed(1) + '%';
      
      if (progress < 1) requestAnimationFrame(animate);
      else {
        winLabel.textContent = winTarget.toFixed(1) + '%';
        loseLabel.textContent = loseTarget.toFixed(1) + '%';
      }
    });
  },

  show12RoundSettlement(winProb) {
    const sim = Game.simulate12Rounds(winProb);
    const totalRounds = 12;
    
    const overlay = document.createElement('div');
    overlay.className = 'pk-settlement-overlay';

    overlay.innerHTML = `
      <div class="settlement-container">
        <div class="settle-header">
          <h2>🏆 一位揭晓</h2>
          <div class="settle-progress">
            <span id="settle-current">0</span> / ${totalRounds}
          </div>
        </div>

        <!-- 揭晓动画区域 -->
        <div class="reveal-area">
          <div class="reveal-round-label">第 <span id="reveal-round">1</span> 位揭晓</div>
          
          <div class="reveal-stage" id="reveal-stage">
            <div class="reveal-tension">
              <div class="tension-spinner">🎬</div>
              <div class="tension-text">揭晓中...</div>
            </div>
          </div>

          <div class="current-wins-bar">
            <div class="cw-label">累计一位: <span id="cw-count">0</span></div>
            <div class="cw-progress">
              <div class="cw-fill" id="cw-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <!-- 所有12次胶囊 -->
        <div class="round-pills-settle" id="round-pills">
          ${Array.from({length: totalRounds}, (_, i) => `
            <div class="round-pill-settle pending" data-idx="${i}">
              <span class="rps-num">${i + 1}</span>
            </div>
          `).join('')}
        </div>

        <!-- 底部按钮 -->
        <div class="settle-actions">
          <button class="btn btn-settle-skip" id="btn-settle-skip">⏭ 跳过揭晓</button>
        </div>

        <!-- 最终结算区域（揭晓全部后显示） -->
        <div class="final-result" id="final-result" style="display: none;">
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 状态管理
    let state = {
      currentIdx: 0,
      wins: 0,
      skipped: false,
      timers: [],
      animating: false
    };

    // 清除所有计时器
    const clearAllTimers = () => {
      state.timers.forEach(t => clearTimeout(t));
      state.timers = [];
    };
    const addTimer = (id) => state.timers.push(id);

    // 更新胶囊状态
    const updatePill = (idx, win) => {
      const pills = overlay.querySelectorAll('.round-pill-settle');
      const pill = pills[idx];
      if (!pill) return;
      pill.classList.remove('pending', 'revealing');
      pill.classList.add(win ? 'win' : 'lose');
    };

    // 把当前胶囊标记为揭晓中
    const markPillRevealing = (idx) => {
      const pills = overlay.querySelectorAll('.round-pill-settle');
      const pill = pills[idx];
      if (!pill) return;
      pill.classList.remove('pending');
      pill.classList.add('revealing');
    };

    // 揭晓单个结果的动画
    const revealSingle = (idx, win, onDone) => {
      if (state.skipped) { onDone(); return; }
      
      state.animating = true;
      const stage = overlay.querySelector('#reveal-stage');
      const roundLabel = overlay.querySelector('#reveal-round');
      const currentSpan = overlay.querySelector('#settle-current');
      
      roundLabel.textContent = idx + 1;
      currentSpan.textContent = idx; // 揭晓前还是之前的数
      
      markPillRevealing(idx);

      // 阶段1: 紧张感（1.2秒）
      stage.innerHTML = `
        <div class="reveal-tension shake">
          <div class="tension-countdown">
            <div class="tc-ring"></div>
            <div class="tc-icon">❓</div>
          </div>
          <div class="tension-text">一位即将揭晓...</div>
          <div class="tension-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      `;

      const t1 = setTimeout(() => {
        if (state.skipped) { onDone(); return; }
        
        // 阶段2: 结果揭晓（0.8秒）
        if (win) {
          state.wins++;
          stage.innerHTML = `
            <div class="reveal-result win-result pop-in">
              <div class="rr-icon">🏆</div>
              <div class="rr-title">第 ${idx + 1} 位 一位！</div>
              <div class="rr-sparkle">✨ 恭喜获得一位！✨</div>
              <div class="confetti-container" id="confetti-${idx}"></div>
            </div>
          `;
          // 触发撒花
          this.spawnConfetti(overlay, `#confetti-${idx}`);
        } else {
          stage.innerHTML = `
            <div class="reveal-result lose-result pop-in">
              <div class="rr-icon lose">💔</div>
              <div class="rr-title lose">第 ${idx + 1} 位 未获一位</div>
              <div class="rr-desc">继续加油，下次一定！</div>
            </div>
          `;
        }
        
        updatePill(idx, win);
        currentSpan.textContent = idx + 1;
        
        // 更新累计一位
        overlay.querySelector('#cw-count').textContent = state.wins;
        overlay.querySelector('#cw-fill').style.width = (state.wins / totalRounds * 100) + '%';
        
        const t2 = setTimeout(() => {
          state.animating = false;
          onDone();
        }, 800);
        addTimer(t2);
        
      }, 1200);
      addTimer(t1);
    };

    // 开始逐个揭晓
    const startReveal = () => {
      const runNext = (idx) => {
        if (idx >= totalRounds || state.skipped) {
          showFinal();
          return;
        }
        revealSingle(idx, sim.roundResults[idx], () => {
          if (!state.skipped) {
            // 加个小间隔再开始下一个
            const gap = setTimeout(() => runNext(idx + 1), 150);
            addTimer(gap);
          } else {
            showFinal();
          }
        });
      };
      runNext(0);
    };

    // 显示最终结果
    const showFinal = () => {
      clearAllTimers();
      state.skipped = true;
      state.animating = false;
      
      // 如果跳过，立即设置所有胶囊
      for (let i = 0; i < totalRounds; i++) {
        updatePill(i, sim.roundResults[i]);
      }
      state.wins = sim.wins;
      overlay.querySelector('#settle-current').textContent = totalRounds;
      overlay.querySelector('#cw-count').textContent = state.wins;
      overlay.querySelector('#cw-fill').style.width = (state.wins / totalRounds * 100) + '%';
      
      // 停止揭晓舞台动画，显示最终
      const stage = overlay.querySelector('#reveal-stage');
      stage.innerHTML = `
        <div class="reveal-done pop-in">
          <div class="rd-icon">🎬</div>
          <div class="rd-text">回归打歌全部结束！</div>
        </div>
      `;
      
      // 隐藏跳过按钮
      overlay.querySelector('#btn-settle-skip').style.display = 'none';
      
      // 渲染最终
      const evaluation = Game.getEvaluation(state.wins);
      
      // 保存PK历史记录
      if (this.currentRegression && this.selectedAlbum) {
        Game.addPKHistory({
          theme: this.currentRegression.themeName,
          themeEmoji: this.currentRegression.themeEmoji,
          albumScale: this.selectedAlbum.scaleName,
          albumStyle: this.selectedAlbum.styleName,
          albumStyleEmoji: this.selectedAlbum.styleEmoji,
          wins: state.wins,
          totalRounds: totalRounds,
          winProb: winProb,
          evaluation: evaluation.label,
          evaluationDesc: evaluation.desc,
          playerCards: this.pkSelectedCards.map(c => ({
            name: c.card ? c.card.name : c.name,
            rarity: c.card ? c.card.rarity : c.rarity
          }))
        });
      }
      
      const finalEl = overlay.querySelector('#final-result');
      
      finalEl.innerHTML = `
        <div class="final-divider"></div>
        <div class="final-summary">
          <div class="fs-number-group">
            <span class="fs-win-num">${state.wins}</span>
            <span class="fs-slash">/</span>
            <span class="fs-total">${totalRounds}</span>
            <span class="fs-unit"> 一位</span>
          </div>
        </div>
        <div class="final-evaluation-big">
          <div class="feb-icon">${evaluation.icon || '🎖️'}</div>
          <div class="feb-label">评价</div>
          <div class="feb-title">${evaluation.label}</div>
          <div class="feb-desc">${evaluation.desc}</div>
        </div>
        <div class="final-meta">
          基础胜率: ${(winProb * 100).toFixed(1)}% | 本次模拟: 12次回归
        </div>
        <div class="final-actions">
          <button class="btn btn-primary" id="btn-regression-again">🔄 再次回归</button>
          <button class="btn btn-secondary" id="btn-close-final">返回</button>
        </div>
      `;
      finalEl.style.display = 'block';
      
      // 按钮事件
      overlay.querySelector('#btn-regression-again').onclick = () => {
        overlay.remove();
        this.startPKFlow();
      };
      overlay.querySelector('#btn-close-final').onclick = () => {
        overlay.remove();
        this.currentRegression = null;
      };
    };

    // 跳过按钮
    overlay.querySelector('#btn-settle-skip').onclick = () => {
      if (state.skipped) return;
      state.skipped = true;
      clearAllTimers();
      showFinal();
    };

    // 开始揭晓（延迟一点让界面先显示）
    const startTimer = setTimeout(() => startReveal(), 300);
    addTimer(startTimer);
  },

  // 撒花效果
  spawnConfetti(container, selector) {
    const target = container.querySelector(selector);
    if (!target) return;
    const colors = ['#fbbf24', '#f97316', '#ef4444', '#3b82f6', '#10b981', '#a855f7'];
    const shapes = ['●', '■', '▲', '★', '♦'];
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      piece.style.color = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = (30 + Math.random() * 40) + '%';
      piece.style.animationDelay = (Math.random() * 0.3) + 's';
      piece.style.setProperty('--tx', (Math.random() * 160 - 80) + 'px');
      piece.style.setProperty('--ty', (60 + Math.random() * 80) + 'px');
      piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      target.appendChild(piece);
    }
  },

  // ===================== 辅助方法 =====================
  getCardEmoji(rarity) {
    const emojis = {
      N: '🎤',
      R: '🎵',
      SR: '🌟',
      SSR: '💫',
      UR: '👑'
    };
    return emojis[rarity] || '🎤';
  },

  getStars(rarity) {
    const stars = { N: 1, R: 2, SR: 3, SSR: 4, UR: 5 };
    return '⭐'.repeat(stars[rarity] || 1);
  },

  createModal(html) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'current-modal';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
    // 点击背景关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeModal();
      }
    });
    
    return overlay;
  },

  closeModal() {
    const modal = document.getElementById('current-modal');
    if (modal) {
      modal.remove();
    }
  },

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
};

// 暴露到window以支持inline onclick
window.UI = UI;

// 启动
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});