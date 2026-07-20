import type { Product } from "@/types/shop";

export const products: Product[] = [
  {
    id: "p-101",
    name: "아크 무선 헤드폰",
    englishName: "Arc Wireless Headphones",
    category: "audio",
    price: 189000,
    originalPrice: 229000,
    rating: 4.8,
    reviewCount: 184,
    description: "공간을 채우는 깊은 사운드와 하루 종일 편안한 착용감.",
    details: ["최대 38시간 재생", "적응형 노이즈 캔슬링", "멀티포인트 연결"],
    colors: ["Midnight", "Fog", "Sage"],
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
    badge: "BEST",
    featured: true
  },
  {
    id: "p-102",
    name: "플로우 기계식 키보드",
    englishName: "Flow Mechanical Keyboard",
    category: "desk",
    price: 149000,
    rating: 4.7,
    reviewCount: 96,
    description: "부드러운 키감과 정돈된 데스크를 위한 75% 배열 키보드.",
    details: ["핫스왑 스위치", "블루투스 3대 연결", "PBT 키캡"],
    colors: ["Cloud", "Graphite"],
    imageUrl:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=85",
    badge: "NEW",
    featured: true
  },
  {
    id: "p-103",
    name: "포인트 에르고 마우스",
    englishName: "Point Ergo Mouse",
    category: "desk",
    price: 89000,
    rating: 4.6,
    reviewCount: 71,
    description: "자연스러운 손목 각도와 정밀한 움직임을 위한 인체공학 마우스.",
    details: ["저소음 클릭", "8K DPI 센서", "USB-C 충전"],
    colors: ["Black", "Sand"],
    imageUrl:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=85",
    featured: true
  },
  {
    id: "p-104",
    name: "모먼트 스마트 워치",
    englishName: "Moment Smart Watch",
    category: "lifestyle",
    price: 239000,
    originalPrice: 269000,
    rating: 4.5,
    reviewCount: 132,
    description: "건강과 일상의 리듬을 단정하게 기록하는 스마트 워치.",
    details: ["7일 배터리", "수면·심박 측정", "5ATM 방수"],
    colors: ["Silver", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85",
    featured: true
  },
  {
    id: "p-105",
    name: "프레임 미러리스 카메라",
    englishName: "Frame Mirrorless Camera",
    category: "lifestyle",
    price: 849000,
    rating: 4.9,
    reviewCount: 48,
    description: "매일의 장면을 선명하고 자연스러운 색으로 남기는 카메라.",
    details: ["2400만 화소", "4K 60fps", "5축 손떨림 보정"],
    colors: ["Black", "Silver"],
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85",
    badge: "EDITOR'S PICK"
  },
  {
    id: "p-106",
    name: "웨이브 블루투스 스피커",
    englishName: "Wave Bluetooth Speaker",
    category: "audio",
    price: 119000,
    rating: 4.7,
    reviewCount: 205,
    description: "어디서나 균형 잡힌 소리를 들려주는 컴팩트 스피커.",
    details: ["360° 사운드", "IP67 방수", "최대 18시간 재생"],
    colors: ["Charcoal", "Blue", "Coral"],
    imageUrl:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=85"
  },
  {
    id: "p-107",
    name: "데이팩 시티 백팩",
    englishName: "Daypack City Backpack",
    category: "lifestyle",
    price: 79000,
    rating: 4.6,
    reviewCount: 87,
    description: "출근과 짧은 여행에 필요한 물건을 가볍게 정리하는 백팩.",
    details: ["16인치 노트북 수납", "생활 방수", "18L 용량"],
    colors: ["Olive", "Black", "Stone"],
    imageUrl:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85"
  },
  {
    id: "p-108",
    name: "헤일로 데스크 램프",
    englishName: "Halo Desk Lamp",
    category: "desk",
    price: 69000,
    rating: 4.4,
    reviewCount: 54,
    description: "집중과 휴식에 맞춰 빛의 온도와 밝기를 조절하는 램프.",
    details: ["5단계 색온도", "플리커 프리", "USB-C 포트"],
    colors: ["White", "Graphite"],
    imageUrl:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85"
  }
];

export const categoryLabels = {
  all: "전체",
  desk: "데스크",
  audio: "오디오",
  lifestyle: "라이프스타일"
} as const;
