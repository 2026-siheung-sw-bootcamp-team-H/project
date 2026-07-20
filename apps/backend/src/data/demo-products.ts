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
    id: "desk-001",
    name: "모듈 데스크 램프",
    englishName: "Module Desk Lamp",
    category: "desk",
    price: 59000,
    rating: 4.8,
    reviewCount: 128,
    description: "집중을 돕는 따뜻한 색온도의 데스크 조명"
  },
  {
    id: "audio-001",
    name: "웨이브 스피커",
    englishName: "Wave Speaker",
    category: "audio",
    price: 89000,
    rating: 4.6,
    reviewCount: 84,
    description: "작은 공간을 위한 무선 스피커"
  },
  {
    id: "life-001",
    name: "오브제 트레이",
    englishName: "Object Tray",
    category: "lifestyle",
    price: 32000,
    rating: 4.7,
    reviewCount: 61,
    description: "책상 위 소품을 정돈하는 금속 트레이"
  }
];
