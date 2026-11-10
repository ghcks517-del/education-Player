import { Category, VideoItem } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: '기본 안전수칙 & 골든룰',
    description: '작업장 10대 안전 골든룰, 작업 전 3대 핵심 안전점검 수칙',
    color: '#F37321', // Hanwha Orange
    order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: '기계 / 설비 작업 안전',
    description: '끼임·협착사고 예방, LOTO(Lockout-Tagout) 안전 조치 절차',
    color: '#E4222D', // Hanwha Red
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    name: '화재 예방 & 비상대응',
    description: '화재·폭발 위험물 관리, 소화기 사용법 및 비상 대피 훈련',
    color: '#FDB913', // Hanwha Gold/Yellow
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    name: '보호구 착용 & 보건관리',
    description: '개인 보호구 올바른 착용법 및 근골격계 질환 예방 가이드',
    color: '#0284C7', // Sky Blue
    order: 4,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'vid-1',
    categoryId: 'cat-1',
    title: '사업장 안전보건 골든룰 10선 및 작업 전 안전점검',
    description: '작업 전 3대 필수 점검 사항과 현장 무재해 달성을 위한 핵심 골든룰 동영상 교육 자료입니다.',
    youtubeUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
    youtubeId: 'aircAruvnKk',
    duration: '03:45',
    speaker: '환경안전보건팀',
    tags: ['안전제일', '골든룰', '작업전점검'],
    watched: false,
    notes: [
      {
        id: 'note-1',
        timestamp: 30,
        formattedTime: '00:30',
        text: '작업 전 보호구 완벽 착용 여부 상호 확인',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'note-2',
        timestamp: 90,
        formattedTime: '01:30',
        text: '위험 구역 출입 통제 및 작업 허가제 준수',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'vid-2',
    categoryId: 'cat-2',
    title: '제조·기계 설비 끼임 및 협착사고 예방 실천 수칙',
    description: '회전체 설비 가동 중 점검 금지, 인터록(안전장치) 임의 해제 금지 및 LOTO 작업 절차 안내.',
    youtubeUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    youtubeId: 'kJQP7kiw5Fk',
    duration: '05:30',
    speaker: '설비안전관리 파트',
    tags: ['끼임예방', 'LOTO', '설비안전'],
    watched: false,
    notes: [
      {
        id: 'note-3',
        timestamp: 60,
        formattedTime: '01:00',
        text: '설비 청소 및 정비 시 반드시 전원 차단 후 꼬리표 부착',
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
  },
  {
    id: 'vid-3',
    categoryId: 'cat-3',
    title: '화재 폭발 예방 및 소화기 사용 비상대응 요령',
    description: '초기 소화기 작동법, 옥내 소화전 사용 요령 및 화재 비상 사이렌 발생 시 신속 대피 동선.',
    youtubeUrl: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
    youtubeId: 'L_LUpnjgPso',
    duration: '04:20',
    speaker: '소방방재센터',
    tags: ['화재예방', '소화기사용법', '비상대피'],
    watched: false,
    notes: [],
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
];
