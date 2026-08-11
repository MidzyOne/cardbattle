// ===================== K-POP 抽卡游戏 配置 =====================
const RARITY = {
  N:   { key: 'N',   name: '练习生', color: '#cccccc', bg: '#3a3a3a', glow: false, sellPrice: 1 },
  R:   { key: 'R',   name: '出道', color: '#4ade80', bg: '#14532d', glow: false, sellPrice: 2 },
  SR:  { key: 'SR',  name: '一线', color: '#60a5fa', bg: '#1e3a5f', glow: false, sellPrice: 3 },
  SSR: { key: 'SSR', name: '顶流', color: '#c084fc', bg: '#4c1d95', glow: true,  sellPrice: 4 },
  UR:  { key: 'UR',  name: '国民', color: '#fbbf24', bg: '#7c2d12', glow: true,  sellPrice: 5 }
};

// ===================== 风格系统 =====================
const STYLES = {
  girl_crush: { key: 'girl_crush', name: 'Girl Crush', emoji: '🔥' },
  cute:       { key: 'cute',       name: 'Cute',       emoji: '🍬' },
  sexy:       { key: 'sexy',       name: 'Sexy',       emoji: '💋' },
  retro:      { key: 'retro',      name: 'Retro',      emoji: '🕺' },
  teen:       { key: 'teen',       name: 'Teen Crush', emoji: '💕' },
  hiphop:     { key: 'hiphop',     name: 'Hip-hop',    emoji: '🎤' },
  elegant:    { key: 'elegant',    name: 'Elegant',    emoji: '🌹' },
  sporty:     { key: 'sporty',     name: 'Sporty',     emoji: '⚡' }
};

// 风格关联度矩阵：主题风格 vs 卡牌风格 → 关联度 (0-100)
// 关联度越高加成越高
const STYLE_AFFINITY = {
  girl_crush: { girl_crush: 100, hiphop: 80, sexy: 70, sporty: 60, teen: 40, elegant: 30, retro: 20, cute: 10 },
  cute:       { cute: 100, teen: 85, sporty: 60, girl_crush: 40, retro: 35, elegant: 30, sexy: 15, hiphop: 10 },
  sexy:       { sexy: 100, girl_crush: 85, elegant: 70, hiphop: 60, retro: 50, teen: 25, sporty: 15, cute: 10 },
  retro:      { retro: 100, elegant: 80, cute: 55, sexy: 50, teen: 40, girl_crush: 20, hiphop: 20, sporty: 15 },
  teen:       { teen: 100, cute: 85, sporty: 70, girl_crush: 50, retro: 45, hiphop: 40, elegant: 20, sexy: 15 },
  hiphop:     { hiphop: 100, girl_crush: 85, sporty: 80, sexy: 65, teen: 55, retro: 35, elegant: 15, cute: 10 },
  elegant:    { elegant: 100, sexy: 80, retro: 75, girl_crush: 45, cute: 40, teen: 25, hiphop: 15, sporty: 10 },
  sporty:     { sporty: 100, teen: 80, hiphop: 75, girl_crush: 60, cute: 50, retro: 25, sexy: 15, elegant: 10 }
};

// ===================== 专辑规模 =====================
const ALBUM_SCALES = {
  solo:  { key: 'solo',  name: 'Solo专辑',  cardCount: 3 },
  mini:  { key: 'mini',  name: 'Mini专辑',  cardCount: 4 },
  full:  { key: 'full',  name: '正规专辑',  cardCount: 5 }
};

// ===================== 评价等级 =====================
const EVALUATION_LEVELS = [
  { min: 12, label: '🏆 国民级回归', desc: '国民级认证，横扫所有一位！' },
  { min: 10, label: '💥 大爆回归', desc: '大获成功，音源票房双丰收！' },
  { min: 8,  label: '🌫️ 大雾回归', desc: '表现优异，稳居一线！' },
  { min: 6,  label: '✅ 成功回归', desc: '圆满完成，稳步上升！' },
  { min: 4,  label: '👍 可以接受', desc: '表现平平，仍需努力！' },
  { min: 2,  label: '↘️ 反向平平', desc: '略有下滑，需要调整！' },
  { min: 0,  label: '❌ 无效回归', desc: '毫无波澜，下次加油！' },
  { min: -Infinity, label: '💀 彻底失败', desc: '惨痛失利，急需反思！' }
];

// ===================== 卡牌数据库 (K-POP Girl Group Members) =====================
const CARDS = [
  // N - 练习生 (12张)
  { id: 'n001', name: '金彩妍', group: '练习生', rarity: 'N', style: 'cute',
    dance: 45, vocal: 42, visual: 55, popularity: 35,
    desc: '甜美可爱的练习生，正在努力学习舞台技巧。' },
  { id: 'n002', name: '李智恩', group: '练习生', rarity: 'N', style: 'teen',
    dance: 40, vocal: 50, visual: 50, popularity: 30,
    desc: '充满青春活力的少女，梦想成为偶像。' },
  { id: 'n003', name: '朴敏雅', group: '练习生', rarity: 'N', style: 'sporty',
    dance: 55, vocal: 38, visual: 45, popularity: 28,
    desc: '运动神经发达，舞蹈实力突出的练习生。' },
  { id: 'n004', name: '崔秀珍', group: '练习生', rarity: 'N', style: 'girl_crush',
    dance: 50, vocal: 40, visual: 48, popularity: 32,
    desc: '性格爽朗，Girl Crush魅力初显。' },
  { id: 'n005', name: '郑艺琳', group: '练习生', rarity: 'N', style: 'retro',
    dance: 38, vocal: 45, visual: 52, popularity: 27,
    desc: '喜欢复古风格的文艺少女。' },
  { id: 'n006', name: '韩雅琳', group: '练习生', rarity: 'N', style: 'cute',
    dance: 42, vocal: 48, visual: 46, popularity: 33,
    desc: '笑起来有酒窝的可爱女孩。' },
  { id: 'n007', name: '尹瑞恩', group: '练习生', rarity: 'N', style: 'hiphop',
    dance: 52, vocal: 35, visual: 44, popularity: 25,
    desc: '热爱Hip-hop，节奏感出色。' },
  { id: 'n008', name: '姜智允', group: '练习生', rarity: 'N', style: 'elegant',
    dance: 35, vocal: 52, visual: 50, popularity: 26,
    desc: '优雅气质的钢琴少女。' },
  { id: 'n009', name: '任多荣', group: '练习生', rarity: 'N', style: 'teen',
    dance: 48, vocal: 43, visual: 47, popularity: 31,
    desc: '充满10代少女感的活力成员。' },
  { id: 'n010', name: '赵美延', group: '练习生', rarity: 'N', style: 'sexy',
    dance: 46, vocal: 44, visual: 49, popularity: 29,
    desc: '成熟魅力初显的潜力成员。' },
  { id: 'n011', name: '河秀映', group: '练习生', rarity: 'N', style: 'sporty',
    dance: 54, vocal: 37, visual: 43, popularity: 24,
    desc: '舞蹈实力出众的运动型女孩。' },
  { id: 'n012', name: '白知宪', group: '练习生', rarity: 'N', style: 'cute',
    dance: 41, vocal: 46, visual: 48, popularity: 30,
    desc: '嗓音清澈的小主唱。' },

  // R - 出道 (12张)
  { id: 'r001', name: '张圭悧', group: 'fromis_9', rarity: 'R', style: 'cute',
    dance: 58, vocal: 55, visual: 62, popularity: 50,
    desc: 'fromis_9门面之一，拥有天使般的笑容。' },
  { id: 'r002', name: '李娜炅', group: 'fromis_9', rarity: 'R', style: 'girl_crush',
    dance: 62, vocal: 52, visual: 58, popularity: 48,
    desc: '舞台上气场十足的Girl Crush担当。' },
  { id: 'r003', name: '金智秀', group: 'Lovelyz', rarity: 'R', style: 'retro',
    dance: 50, vocal: 65, visual: 60, popularity: 52,
    desc: 'Lovelyz的主唱，声线温柔复古。' },
  { id: 'r004', name: '柳秀静', group: 'Lovelyz', rarity: 'R', style: 'elegant',
    dance: 48, vocal: 68, visual: 63, popularity: 55,
    desc: '优雅气质主唱，抒情曲女王。' },
  { id: 'r005', name: '朴秀荣', group: 'Red Velvet', rarity: 'R', style: 'sexy',
    dance: 60, vocal: 58, visual: 65, popularity: 60,
    desc: 'Red Velvet的Joy，甜蜜性感并存。' },
  { id: 'r006', name: '金艺琳', group: 'Red Velvet', rarity: 'R', style: 'cute',
    dance: 56, vocal: 54, visual: 64, popularity: 58,
    desc: 'Red Velvet的Yeri，最萌忙内。' },
  { id: 'r007', name: '姜涩琪', group: 'Red Velvet', rarity: 'R', style: 'girl_crush',
    dance: 68, vocal: 60, visual: 55, popularity: 62,
    desc: 'Red Velvet主舞，舞台控制力一流。' },
  { id: 'r008', name: '裴珠泫', group: 'Red Velvet', rarity: 'R', style: 'elegant',
    dance: 52, vocal: 58, visual: 68, popularity: 65,
    desc: 'Red Velvet门面Irene，优雅至上。' },
  { id: 'r009', name: '孙承完', group: 'MAMAMOO', rarity: 'R', style: 'hiphop',
    dance: 65, vocal: 56, visual: 50, popularity: 58,
    desc: 'MAMAMOO的Moonbyul，Hip-hop自信满满。' },
  { id: 'r010', name: '丁辉人', group: 'MAMAMOO', rarity: 'R', style: 'teen',
    dance: 58, vocal: 62, visual: 55, popularity: 52,
    desc: 'MAMAMOO的Wheein，音色独特。' },
  { id: 'r011', name: '金夏妍', group: 'OH MY GIRL', rarity: 'R', style: 'sporty',
    dance: 64, vocal: 50, visual: 52, popularity: 45,
    desc: 'OH MY GIRL主舞，运动能力超群。' },
  { id: 'r012', name: '崔孝定', group: 'OH MY GIRL', rarity: 'R', style: 'cute',
    dance: 55, vocal: 63, visual: 58, popularity: 50,
    desc: 'OH MY GIRL主唱，舞台表现稳定。' },

  // SR - 一线 (10张)
  { id: 'sr001', name: '金泰妍', group: 'SNSD', rarity: 'SR', style: 'elegant',
    dance: 60, vocal: 82, visual: 68, popularity: 80,
    desc: '少女时代队长，SOLO也红的天籁之音。' },
  { id: 'sr002', name: '郑秀妍', group: 'SNSD', rarity: 'SR', style: 'retro',
    dance: 58, vocal: 78, visual: 72, popularity: 78,
    desc: '前少女时代Jessica，音色复古迷人。' },
  { id: 'sr003', name: '李顺圭', group: 'SNSD', rarity: 'SR', style: 'cute',
    dance: 62, vocal: 75, visual: 65, popularity: 72,
    desc: '少女时代Sunny，活力四射。' },
  { id: 'sr004', name: '黄美英', group: 'SNSD', rarity: 'SR', style: 'girl_crush',
    dance: 65, vocal: 76, visual: 70, popularity: 75,
    desc: '少女时代Tiffany，舞台表现华丽。' },
  { id: 'sr005', name: '金孝渊', group: 'SNSD', rarity: 'SR', style: 'hiphop',
    dance: 80, vocal: 62, visual: 60, popularity: 70,
    desc: '少女时代主舞孝渊，舞蹈实力顶尖。' },
  { id: 'sr006', name: '权俞利', group: 'SNSD', rarity: 'SR', style: 'sporty',
    dance: 72, vocal: 68, visual: 66, popularity: 68,
    desc: '少女时代Yuri，舞台全能。' },
  { id: 'sr007', name: '崔秀英', group: 'SNSD', rarity: 'SR', style: 'elegant',
    dance: 64, vocal: 72, visual: 74, popularity: 72,
    desc: '少女时代秀英，优雅长腿担当。' },
  { id: 'sr008', name: '林允儿', group: 'SNSD', rarity: 'SR', style: 'teen',
    dance: 66, vocal: 70, visual: 85, popularity: 82,
    desc: '少女时代门面允儿，演技唱功双佳。' },
  { id: 'sr009', name: '徐珠贤', group: 'SNSD', rarity: 'SR', style: 'cute',
    dance: 60, vocal: 75, visual: 72, popularity: 70,
    desc: '少女时代忙内Seohyun，乖巧温柔。' },
  { id: 'sr010', name: '金裁经', group: '2NE1', rarity: 'SR', style: 'girl_crush',
    dance: 70, vocal: 72, visual: 68, popularity: 74,
    desc: '前2NE1成员，Girl Crush代表。' },

  // SSR - 顶流 (8张)
  { id: 'ssr001', name: '全智妍', group: '2NE1', rarity: 'SSR', style: 'girl_crush',
    dance: 78, vocal: 80, visual: 78, popularity: 88,
    desc: '前2NE1队长CL，国际级舞台表现。' },
  { id: 'ssr002', name: '朴春', group: '2NE1', rarity: 'SSR', style: 'sexy',
    dance: 70, vocal: 78, visual: 85, popularity: 82,
    desc: '前2NE1朴春，性感嗓音独一无二。' },
  { id: 'ssr003', name: '朴山多拉', group: '2NE1', rarity: 'SSR', style: 'cute',
    dance: 75, vocal: 76, visual: 82, popularity: 80,
    desc: '前2NE1 Dara，童颜美貌。' },
  { id: 'ssr004', name: '朴彩英', group: 'BLACKPINK', rarity: 'SSR', style: 'sexy',
    dance: 78, vocal: 85, visual: 90, popularity: 92,
    desc: 'BLACKPINK Rosé，蜜嗓玫瑰。' },
  { id: 'ssr005', name: '金智秀', group: 'BLACKPINK', rarity: 'SSR', style: 'elegant',
    dance: 70, vocal: 80, visual: 92, popularity: 90,
    desc: 'BLACKPINK Jisoo，门面担当，优雅气质。' },
  { id: 'ssr006', name: '金珍妮', group: 'BLACKPINK', rarity: 'SSR', style: 'hiphop',
    dance: 82, vocal: 80, visual: 90, popularity: 91,
    desc: 'BLACKPINK Jennie，舞台女王，气场十足。' },
  { id: 'ssr007', name: '朴敏英', group: 'AOA', rarity: 'SSR', style: 'sexy',
    dance: 72, vocal: 74, visual: 88, popularity: 85,
    desc: 'AOA金雪炫，CF女王。' },
  { id: 'ssr008', name: '申敏儿', group: 'GFRIEND', rarity: 'SSR', style: 'retro',
    dance: 75, vocal: 78, visual: 80, popularity: 80,
    desc: 'GFRIEND Sowon，清纯复古气质。' },

  // UR - 国民 (5张)
  { id: 'ur001', name: '李智恩', group: 'IU', rarity: 'UR', style: 'elegant',
    dance: 68, vocal: 95, visual: 85, popularity: 98,
    desc: '国民歌手IU，无论歌唱还是创作都是顶级。' },
  { id: 'ur002', name: '金泰妍', group: 'SNSD', rarity: 'UR', style: 'sexy',
    dance: 76, vocal: 92, visual: 80, popularity: 95,
    desc: '女帝金泰妍，SOLO专辑销量破纪录。' },
  { id: 'ur003', name: '林娜琏', group: 'TWICE', rarity: 'UR', style: 'teen',
    dance: 82, vocal: 88, visual: 90, popularity: 96,
    desc: 'TWICE娜琏，国民级Center，人气无敌。' },
  { id: 'ur004', name: '周子瑜', group: 'TWICE', rarity: 'UR', style: 'elegant',
    dance: 80, vocal: 85, visual: 96, popularity: 94,
    desc: 'TWICE子瑜，全球门面，美貌与实力并存。' },
  { id: 'ur005', name: '金智妮', group: 'BLACKPINK', rarity: 'UR', style: 'girl_crush',
    dance: 88, vocal: 90, visual: 94, popularity: 99,
    desc: 'BLACKPINK Jennie Kim，全球现象级巨星。' }
];

// ===================== 卡包配置 =====================
const PACKS = [
  {
    id: 'rookie',
    name: '练习生卡包',
    desc: '发掘新人和潜力股的入门卡包',
    price: { normal: 100, special: 0 },
    cardCount: 5,
    pool: {
      N:   { ids: ['n001','n002','n003','n004','n005','n006','n007','n008','n009','n010','n011','n012'], weight: 60 },
      R:   { ids: ['r001','r002','r003','r004','r005','r006','r007','r008','r009','r010','r011','r012'], weight: 28 },
      SR:  { ids: ['sr001','sr002','sr003','sr004','sr005','sr006','sr007','sr008','sr009','sr010'], weight: 10 },
      SSR: { ids: ['ssr001','ssr002'], weight: 1.5 },
      UR:  { ids: ['ur001'], weight: 0.5 }
    },
    exchangeCardChance: 0.05,
    image: 'rookie'
  },
  {
    id: 'debut',
    name: '出道卡包',
    desc: '一线偶像聚集的进阶卡包',
    price: { normal: 300, special: 0 },
    cardCount: 5,
    pool: {
      N:   { ids: ['n001','n002','n003','n004','n005','n006','n007','n008','n009','n010','n011','n012'], weight: 25 },
      R:   { ids: ['r001','r002','r003','r004','r005','r006','r007','r008','r009','r010','r011','r012'], weight: 35 },
      SR:  { ids: ['sr001','sr002','sr003','sr004','sr005','sr006','sr007','sr008','sr009','sr010'], weight: 28 },
      SSR: { ids: ['ssr001','ssr002','ssr003','ssr004','ssr005','ssr006','ssr007','ssr008'], weight: 9 },
      UR:  { ids: ['ur001','ur002','ur003','ur004','ur005'], weight: 3 }
    },
    exchangeCardChance: 0.1,
    image: 'debut'
  },
  {
    id: 'legend',
    name: '国民卡包',
    desc: '国民级偶像云集的顶级卡包',
    price: { normal: 0, special: 10 },
    cardCount: 5,
    pool: {
      N:   { ids: ['n001','n002','n003','n004','n005','n006','n007','n008','n009','n010','n011','n012'], weight: 5 },
      R:   { ids: ['r001','r002','r003','r004','r005','r006','r007','r008','r009','r010','r011','r012'], weight: 15 },
      SR:  { ids: ['sr001','sr002','sr003','sr004','sr005','sr006','sr007','sr008','sr009','sr010'], weight: 35 },
      SSR: { ids: ['ssr001','ssr002','ssr003','ssr004','ssr005','ssr006','ssr007','ssr008'], weight: 30 },
      UR:  { ids: ['ur001','ur002','ur003','ur004','ur005'], weight: 15 }
    },
    exchangeCardChance: 0.2,
    image: 'legend'
  }
];

// ===================== 兑换系统配置 =====================
const EXCHANGE_CONFIG = {
  permanent: [
    { cardId: 'ssr004', cost: 50, name: 'ROSÉ', rarity: 'SSR' },
    { cardId: 'ssr006', cost: 50, name: 'JENNIE', rarity: 'SSR' },
    { cardId: 'ur001', cost: 150, name: 'IU', rarity: 'UR' },
    { cardId: 'ur005', cost: 200, name: 'JENNIE KIM', rarity: 'UR' }
  ],
  limited: [
    {
      id: 'limited_1',
      startTime: null,
      durationHours: 48,
      cards: [
        { cardId: 'ur003', cost: 120, name: 'NAYEON', rarity: 'UR' },
        { cardId: 'ur004', cost: 120, name: 'TZUYU', rarity: 'UR' }
      ]
    }
  ]
};

// ===================== 签到奖励 =====================
const CHECKIN_REWARDS = [
  { day: 1, normal: 50, special: 0, desc: '50 普通货币' },
  { day: 2, normal: 80, special: 0, desc: '80 普通货币' },
  { day: 3, normal: 100, special: 1, desc: '100普通+1特殊' },
  { day: 4, normal: 120, special: 0, desc: '120 普通货币' },
  { day: 5, normal: 150, special: 0, desc: '150 普通货币' },
  { day: 6, normal: 200, special: 2, desc: '200普通+2特殊' },
  { day: 7, normal: 300, special: 5, desc: '300普通+5特殊' }
];

// ===================== 充值配置 =====================
const RECHARGE_OPTIONS = [
  { id: 'r1', normal: 100, special: 0, price: 10, desc: '100 普通货币', icon: '💰' },
  { id: 'r2', normal: 500, special: 0, price: 30, desc: '500 普通货币', icon: '💰' },
  { id: 'r3', normal: 0, special: 10, price: 50, desc: '10 特殊货币', icon: '💎' },
  { id: 'r4', normal: 1000, special: 0, price: 60, desc: '1000 普通货币', icon: '💰' },
  { id: 'r5', normal: 0, special: 30, price: 128, desc: '30 特殊货币', icon: '💎' },
  { id: 'r6', normal: 2000, special: 50, price: 328, desc: '2000普通+50特殊', icon: '🎁' }
];

// ===================== 小游戏配置 =====================
const MINIGAME_CONFIG = {
  compare: {
    minWin: 30,
    maxWin: 100,
    losePenalty: 0,
    drawReward: 20,
    specialChance: 0.1
  }
};

// ===================== 系统赠送 =====================
const SYSTEM_GIFTS = [
  { hour: 12, minute: 0, normal: 100, special: 1, desc: '午间礼包' },
  { hour: 20, minute: 0, normal: 200, special: 2, desc: '晚间礼包' }
];

// ===================== 收集进度奖励 =====================
const COLLECTION_REWARDS = [
  { threshold: 15, reward: { normal: 200, special: 1 }, desc: '收集15种成员' },
  { threshold: 25, reward: { normal: 500, special: 3 }, desc: '收集25种成员' },
  { threshold: 35, reward: { normal: 1000, special: 5 }, desc: '收集35种成员' },
  { threshold: 45, reward: { normal: 2000, special: 10 }, desc: '收集45种成员' },
  { threshold: 55, reward: { normal: 5000, special: 30 }, desc: '收集全部成员！' }
];