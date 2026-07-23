export type DemoProduct = {
  id: string;
  name: string;
  englishName: string;
  category: "desk" | "audio" | "lifestyle";
  price: number;
  rating: number;
  reviewCount: number;
  description: string;
};

export const demoProducts: DemoProduct[] = [
  {
    id: "p-101",
    name: "아크 무선 헤드폰",
    englishName: "Arc Wireless Headphones",
    category: "audio",
    price: 189000,
    rating: 4.8,
    reviewCount: 184,
    description: "공간을 채우는 깊은 사운드와 하루 종일 편안한 착용감."
  },
  {
    id: "p-102",
    name: "플로우 기계식 키보드",
    englishName: "Flow Mechanical Keyboard",
    category: "desk",
    price: 149000,
    rating: 4.7,
    reviewCount: 96,
    description: "부드러운 키감과 정돈된 데스크를 위한 75% 배열 키보드."
  },
  {
    id: "p-103",
    name: "포인트 에르고 마우스",
    englishName: "Point Ergo Mouse",
    category: "desk",
    price: 89000,
    rating: 4.6,
    reviewCount: 71,
    description: "자연스러운 손목 각도와 정밀한 움직임을 위한 인체공학 마우스."
  },
  {
    id: "p-104",
    name: "모먼트 스마트 워치",
    englishName: "Moment Smart Watch",
    category: "lifestyle",
    price: 239000,
    rating: 4.5,
    reviewCount: 132,
    description: "건강과 일상의 리듬을 단정하게 기록하는 스마트 워치."
  },
  {
    id: "p-105",
    name: "프레임 미러리스 카메라",
    englishName: "Frame Mirrorless Camera",
    category: "lifestyle",
    price: 849000,
    rating: 4.9,
    reviewCount: 48,
    description: "매일의 장면을 선명하고 자연스러운 색으로 남기는 카메라."
  },
  {
    id: "p-106",
    name: "웨이브 블루투스 스피커",
    englishName: "Wave Bluetooth Speaker",
    category: "audio",
    price: 119000,
    rating: 4.7,
    reviewCount: 205,
    description: "어디서나 균형 잡힌 소리를 들려주는 컴팩트 스피커."
  },
  {
    id: "p-107",
    name: "데이팩 시티 백팩",
    englishName: "Daypack City Backpack",
    category: "lifestyle",
    price: 79000,
    rating: 4.6,
    reviewCount: 87,
    description: "출근과 짧은 여행에 필요한 물건을 가볍게 정리하는 백팩."
  },
  {
    id: "p-108",
    name: "헤일로 데스크 램프",
    englishName: "Halo Desk Lamp",
    category: "desk",
    price: 69000,
    rating: 4.4,
    reviewCount: 54,
    description: "집중과 휴식에 맞춰 빛의 온도와 밝기를 조절하는 램프."
  }
];
