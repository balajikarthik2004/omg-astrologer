export interface ConsultationRequest {
  id: string;
  devoteeName: string;
  type: string;
  requestedDate: string;
  requestedTime: string;
  duration: string;
  price: string;
  concerns: string;
  isNewDevotee: boolean;
  status: 'pending';
}

export const mockRequestsData: ConsultationRequest[] = [
  {
    id: "req-1",
    devoteeName: "Sanjay Gupta",
    type: "Business Consultation",
    requestedDate: "16 Jul 2026",
    requestedTime: "10:00 AM",
    duration: "60 mins",
    price: "3,500",
    concerns: "Starting a new venture in the upcoming Navratri. Need to check if the planetary alignment is favorable for a tech business.",
    isNewDevotee: true,
    status: "pending"
  },
  {
    id: "req-2",
    devoteeName: "Meera Reddy",
    type: "Marriage Compatibility",
    requestedDate: "16 Jul 2026",
    requestedTime: "04:30 PM",
    duration: "45 mins",
    price: "2,500",
    concerns: "Received a proposal. Need to match Kundali with the boy from Bangalore.",
    isNewDevotee: false,
    status: "pending"
  },
  {
    id: "req-3",
    devoteeName: "Rohan Desai",
    type: "Health Reading",
    requestedDate: "17 Jul 2026",
    requestedTime: "11:00 AM",
    duration: "30 mins",
    price: "1,200",
    concerns: "Facing frequent headaches and sleep issues since the last eclipse. Need astrological remedies.",
    isNewDevotee: true,
    status: "pending"
  }
];
