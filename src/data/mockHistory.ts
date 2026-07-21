export interface HistoryItem {
  id: string;
  type: string;
  date: string;
  time: string;
  duration: string;
  status: 'completed' | 'cancelled';
  devotee: string;
  price: string;
  rating?: number;
  notes?: string;
  remedies?: string[];
}

export const historyData: HistoryItem[] = [
  {
    id: "1",
    type: "Career Guidance",
    date: "14 Jul 2026",
    time: "10:00 AM",
    duration: "45 mins",
    status: "completed",
    devotee: "Priya Singh",
    price: "1,500",
    rating: 5,
    notes: "Priya is concerned about a job switch. Advised her to wait until November when Jupiter transitions favourably for her career house.",
    remedies: [
      "Offer water to Surya Dev every morning",
      "Wear a Yellow Sapphire (Pukhraj) on index finger",
      "Recite Aditya Hridaya Stotra on Sundays"
    ]
  },
  {
    id: "2",
    type: "Marriage Compatibility",
    date: "05 Jul 2026",
    time: "06:30 AM",
    duration: "60 mins",
    status: "completed",
    devotee: "Rahul Verma",
    price: "5,000",
    rating: 4,
    notes: "Matched Kundalis for Rahul and Swati. Mangal Dosha present in Rahul's chart but cancelled by Saturn's aspect in Swati's chart. Good match overall (28/36 Gunas).",
    remedies: [
      "Perform Kumbh Vivah before actual marriage",
      "Chant Mangal Beej Mantra 108 times on Tuesdays"
    ]
  },
  {
    id: "3",
    type: "Kundali Review",
    date: "22 Jun 2026",
    time: "02:00 PM",
    duration: "30 mins",
    status: "cancelled",
    devotee: "Anita Desai",
    price: "800",
    notes: "Devotee did not join the session. Refund initiated."
  },
  {
    id: "4",
    type: "Health Reading",
    date: "18 Jun 2026",
    time: "04:00 PM",
    duration: "30 mins",
    status: "completed",
    devotee: "Vikram Malhotra",
    price: "1,200",
    rating: 5,
    notes: "Vikram was experiencing digestive issues. Rahu's transit in the 6th house is causing this. Suggested dietary changes and astrological remedies.",
    remedies: [
      "Donate black sesame seeds on Saturdays",
      "Avoid non-veg on Tuesdays and Saturdays"
    ]
  },
  {
    id: "5",
    type: "New Born Naming",
    date: "10 Jun 2026",
    time: "11:00 AM",
    duration: "45 mins",
    status: "completed",
    devotee: "Suresh & Meena",
    price: "2,100",
    rating: 5,
    notes: "Baby boy born under Rohini Nakshatra. Suggested names starting with 'O', 'Va', 'Vi', 'Vu'. They finalised the name 'Vivaan'.",
    remedies: [
      "Perform Annaprashan in the 6th month on a Thursday"
    ]
  },
  {
    id: "6",
    type: "Business Consultation",
    date: "02 Jun 2026",
    time: "09:30 AM",
    duration: "60 mins",
    status: "completed",
    devotee: "Anand Rathi",
    price: "3,500",
    rating: 4,
    notes: "Anand wants to start a new venture in real estate. Favourable period starts next year. Advised against partnering with anyone for now.",
    remedies: [
      "Worship Lord Ganesha daily",
      "Keep a solid silver square in wallet"
    ]
  }
];
