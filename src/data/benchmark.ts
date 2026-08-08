export type BenchmarkKind = 'reaction' | 'number' | 'visual' | 'typing' | 'aim' | 'stroop' | 'planned';

export interface BenchmarkTest {
  id: string;
  kind: BenchmarkKind;
  title: string;
  intro: string;
  unit: string;
  playable: boolean;
  color: 'blue' | 'yellow' | 'pink' | 'green';
}

export const benchmarkTests: BenchmarkTest[] = [
  { id: 'reaction', kind: 'reaction', title: '反应测试', intro: '测试您的视觉反应。', unit: 'ms', playable: true, color: 'blue' },
  { id: 'number', kind: 'number', title: '数字记忆', intro: '记住您看到的数字。', unit: '级', playable: true, color: 'yellow' },
  { id: 'visual', kind: 'visual', title: '视觉记忆', intro: '记住越来越多的方块。', unit: '级', playable: true, color: 'pink' },
  { id: 'typing', kind: 'typing', title: '打字测试', intro: '您每分钟可以打多少字？', unit: '字 / 分钟', playable: true, color: 'green' },
  { id: 'aim', kind: 'aim', title: '瞄准测试', intro: '您能多快击中目标？', unit: 'ms / 目标', playable: true, color: 'blue' },
  { id: 'stroop', kind: 'stroop', title: '斯特鲁普', intro: '判断文字显示的颜色。', unit: '分', playable: true, color: 'pink' },
  { id: 'chimp', kind: 'planned', title: '黑猩猩测试', intro: '记住数字方块的位置。', unit: '级', playable: false, color: 'yellow' },
  { id: 'color', kind: 'planned', title: '色觉测试', intro: '快速找出不同的颜色。', unit: '级', playable: false, color: 'green' },
  { id: 'verbal', kind: 'planned', title: '词汇记忆', intro: '尽可能记住更多的词汇。', unit: '个', playable: false, color: 'blue' },
  { id: 'sequential', kind: 'planned', title: '序列记忆', intro: '记住越来越长的序列。', unit: '级', playable: false, color: 'yellow' },
  { id: 'luck', kind: 'planned', title: '运气测试', intro: '快乐的抽卡时刻。', unit: '百分位', playable: false, color: 'pink' },
  { id: 'speed', kind: 'planned', title: '手速测试', intro: '您的手速如何？', unit: '次', playable: false, color: 'green' },
  { id: 'time', kind: 'planned', title: '时间感知测试', intro: '尝试判断时间。', unit: 'ms', playable: false, color: 'blue' },
  { id: 'coordination', kind: 'planned', title: '手眼协调测试', intro: '测试手和眼睛的配合。', unit: '分', playable: false, color: 'yellow' },
  { id: 'calculate', kind: 'planned', title: '计算能力测试', intro: '快速且精确地计算。', unit: '分', playable: false, color: 'pink' },
  { id: 'schulte', kind: 'planned', title: '舒尔特方格', intro: '训练您的专注力。', unit: '秒', playable: false, color: 'green' },
  { id: 'acuity', kind: 'planned', title: '动态视力测试', intro: '测试对移动物体的视觉敏感度。', unit: '级', playable: false, color: 'blue' },
  { id: 'attention', kind: 'planned', title: '持续注意力测试', intro: '您能持续专注多久？', unit: '秒', playable: false, color: 'yellow' }
];
