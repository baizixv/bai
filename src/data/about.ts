export const about = {
  name: '白子诩',
  role: '独立开发者、设计与互联网观察者',
  intro: '我喜欢把模糊的好奇心，慢慢做成可以访问的东西。写文章、做工具、收集链接，也在周末做一些不一定有用但很好玩的实验。',
  location: '中国 · 远程工作',
  availability: '目前接受有趣的小型合作',
  email: 'bai.zixu@qq.com',
  stats: [
    { label: '开始记录', value: '2021' },
    { label: '公开项目', value: '12' },
    { label: '当前版本', value: 'v0.4.0' }
  ],
  progress: [
    { name: '个人网站 2.0', detail: '内容系统与视觉重构', status: '进行中', percent: 68, color: 'blue' }
  ],
  releases: [
    { version: 'v0.4.0', date: '2025.03.18', title: '迁移到 Astro', description: '加入 Markdown 内容集合、独立详情页和类型检查。' },
    { version: 'v0.3.0', date: '2025.03.12', title: '项目与游戏分组', description: '把普通项目和游戏实验拆成两个独立的展示区。' },
    { version: 'v0.2.0', date: '2025.02.21', title: '工作台上线', description: '建立文章、收藏、工具与项目的第一个首页。' }
  ]
} as const;
