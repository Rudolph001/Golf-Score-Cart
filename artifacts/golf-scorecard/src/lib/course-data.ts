import type { Hole } from "@workspace/api-client-react";

// 9 physical hole pin positions — shared by front 9 (holes 1-9) and back 9 (holes 10-18)
const PINS = [
  { lat: -32.7390, lng: 17.9735 }, // Physical hole 1
  { lat: -32.7370, lng: 17.9762 }, // Physical hole 2
  { lat: -32.7385, lng: 17.9790 }, // Physical hole 3
  { lat: -32.7408, lng: 17.9808 }, // Physical hole 4
  { lat: -32.7438, lng: 17.9818 }, // Physical hole 5 (harbour view)
  { lat: -32.7468, lng: 17.9798 }, // Physical hole 6
  { lat: -32.7472, lng: 17.9770 }, // Physical hole 7
  { lat: -32.7460, lng: 17.9742 }, // Physical hole 8
  { lat: -32.7442, lng: 17.9748 }, // Physical hole 9 (near clubhouse)
];

const TEES_FRONT = [
  { lat: -32.7430, lng: 17.9760 },
  { lat: -32.7392, lng: 17.9738 },
  { lat: -32.7372, lng: 17.9764 },
  { lat: -32.7387, lng: 17.9793 },
  { lat: -32.7410, lng: 17.9810 },
  { lat: -32.7440, lng: 17.9820 },
  { lat: -32.7470, lng: 17.9800 },
  { lat: -32.7474, lng: 17.9773 },
  { lat: -32.7462, lng: 17.9745 },
];

const TEES_BACK = [
  { lat: -32.7432, lng: 17.9758 },
  { lat: -32.7394, lng: 17.9736 },
  { lat: -32.7374, lng: 17.9762 },
  { lat: -32.7389, lng: 17.9791 },
  { lat: -32.7412, lng: 17.9808 },
  { lat: -32.7442, lng: 17.9818 },
  { lat: -32.7472, lng: 17.9798 },
  { lat: -32.7476, lng: 17.9771 },
  { lat: -32.7464, lng: 17.9743 },
];

// Official 2025/26 Scorecard — Shelley Point Country Club
// Source: https://shelleypointcountryclub.co.za/course/
// Yellow tees (Club tees) | Blue tees (Senior/Ladies tees)
export const SHELLEY_POINT_HOLES: Hole[] = [
  // ── FRONT 9 ──────────────────────────────────────────────────────────────
  {
    number: 1, par: 5, distanceMen: 411, distanceLadies: 379, strokeIndex: 9,
    name: "Lighthouse",
    description: "A great birdie opportunity on a short Par 5 with assisting wind. Accurate tee-shot needed to clear 3 left fairway bunkers. Large green protected by bunkers front and left.",
    teeLat: TEES_FRONT[0].lat, teeLng: TEES_FRONT[0].lng,
    pinLat: PINS[0].lat, pinLng: PINS[0].lng,
  },
  {
    number: 2, par: 4, distanceMen: 325, distanceLadies: 308, strokeIndex: 5,
    name: "Pelican",
    description: "Wind in your face — hit a piercing tee shot to centre of fairway. Severely sloping fairway. Mid-long iron to a difficult green with two greenside bunkers and a Palm Tree. Don't be disappointed with a bogey.",
    teeLat: TEES_FRONT[1].lat, teeLng: TEES_FRONT[1].lng,
    pinLat: PINS[1].lat, pinLng: PINS[1].lng,
  },
  {
    number: 3, par: 3, distanceMen: 139, distanceLadies: 131, strokeIndex: 15,
    name: "Lagoon",
    description: "First of two great Par 3s. Wind plays a factor in club choice. Out of Bounds left and right. Two bunkers protect the green — bail out areas exist but are difficult.",
    teeLat: TEES_FRONT[2].lat, teeLng: TEES_FRONT[2].lng,
    pinLat: PINS[2].lat, pinLng: PINS[2].lng,
  },
  {
    number: 4, par: 4, distanceMen: 359, distanceLadies: 324, strokeIndex: 1,
    name: "Atlantic",
    description: "Stroke 1 — a true test. Drive must clear the pond to reach the fairway. OB left and right. A Palm Tree left has caught many a ball. Large green with bunkers front and left. Celebrate a par!",
    teeLat: TEES_FRONT[3].lat, teeLng: TEES_FRONT[3].lng,
    pinLat: PINS[3].lat, pinLng: PINS[3].lng,
  },
  {
    number: 5, par: 3, distanceMen: 160, distanceLadies: 141, strokeIndex: 11,
    name: "Harbour View",
    description: "Beautiful Par 3 with stunning palm trees behind the green and views over St Helena Bay Harbour. Wind generally helps. Avoid two bunkers left — right is the better miss. Stay left of cart path.",
    teeLat: TEES_FRONT[4].lat, teeLng: TEES_FRONT[4].lng,
    pinLat: PINS[4].lat, pinLng: PINS[4].lng,
  },
  {
    number: 6, par: 5, distanceMen: 450, distanceLadies: 419, strokeIndex: 13,
    name: "The Long One",
    description: "Longer Par 5 with assisting wind. Long tee shot and well-struck 3-wood/long iron needed to reach in two. Avoid fairway bunkers off the tee. The 'Captain's Bunker' right costs a fine! Left is GUR with a drop zone.",
    teeLat: TEES_FRONT[5].lat, teeLng: TEES_FRONT[5].lng,
    pinLat: PINS[5].lat, pinLng: PINS[5].lng,
  },
  {
    number: 7, par: 4, distanceMen: 262, distanceLadies: 236, strokeIndex: 17,
    name: "Bay View",
    description: "Beautiful short Par 4 with stunning views of Shelley Point Estate and the ocean. Take a 5/6 iron off the tee — leaves a wedge into the green. Don't go long — thick bush at the back will swallow your ball.",
    teeLat: TEES_FRONT[6].lat, teeLng: TEES_FRONT[6].lng,
    pinLat: PINS[6].lat, pinLng: PINS[6].lng,
  },
  {
    number: 8, par: 4, distanceMen: 320, distanceLadies: 275, strokeIndex: 7,
    name: "Golden Mile",
    description: "Plays into the south-easterly wind — tricky tee-shot. OB in Golden Mile Road right, rough left. Wind adds 40–50m of perceived distance when blowing hard. Large green with deep bunker left and rough right.",
    teeLat: TEES_FRONT[7].lat, teeLng: TEES_FRONT[7].lng,
    pinLat: PINS[7].lat, pinLng: PINS[7].lng,
  },
  {
    number: 9, par: 4, distanceMen: 340, distanceLadies: 320, strokeIndex: 3,
    name: "Homeward",
    description: "Final hole in front of the stunning clubhouse. Tiger-line left of the palm tree is high risk, high reward. Safer option: 3-wood to centre, mid-short iron approach. Generous green with front-left bunker — club up!",
    teeLat: TEES_FRONT[8].lat, teeLng: TEES_FRONT[8].lng,
    pinLat: PINS[8].lat, pinLng: PINS[8].lng,
  },

  // ── BACK 9 (same physical holes, different yellow tees) ─────────────────
  {
    number: 10, par: 5, distanceMen: 388, distanceLadies: 372, strokeIndex: 14,
    name: "Lighthouse",
    description: "Same green as hole 1, different tee position. Assisting wind — shorter from these tees but still requires accuracy to clear the fairway bunkers.",
    teeLat: TEES_BACK[0].lat, teeLng: TEES_BACK[0].lng,
    pinLat: PINS[0].lat, pinLng: PINS[0].lng,
  },
  {
    number: 11, par: 4, distanceMen: 316, distanceLadies: 301, strokeIndex: 6,
    name: "Pelican",
    description: "Wind in your face from these tees. Mid-long iron to difficult sloping green. Two greenside bunkers plus Palm Tree in fairway — short and right is the safest miss.",
    teeLat: TEES_BACK[1].lat, teeLng: TEES_BACK[1].lng,
    pinLat: PINS[1].lat, pinLng: PINS[1].lng,
  },
  {
    number: 12, par: 3, distanceMen: 162, distanceLadies: 137, strokeIndex: 12,
    name: "Lagoon",
    description: "Plays slightly longer from the back tee. Wind is a major factor. OB both sides. Solid iron required to find this elevated green. Avoid both bunkers.",
    teeLat: TEES_BACK[2].lat, teeLng: TEES_BACK[2].lng,
    pinLat: PINS[2].lat, pinLng: PINS[2].lng,
  },
  {
    number: 13, par: 4, distanceMen: 353, distanceLadies: 281, strokeIndex: 2,
    name: "Atlantic",
    description: "Stroke 2 from the back tee. Pond still in play off the tee. OB both sides. Palm Tree on left is a constant danger. Large green — a par here is a great achievement.",
    teeLat: TEES_BACK[3].lat, teeLng: TEES_BACK[3].lng,
    pinLat: PINS[3].lat, pinLng: PINS[3].lng,
  },
  {
    number: 14, par: 3, distanceMen: 151, distanceLadies: 133, strokeIndex: 16,
    name: "Harbour View",
    description: "Beautiful Par 3 with harbour views. Wind normally assists slightly. Need a solid struck iron. Avoid two bunkers left — right is better. Stay left of cart path.",
    teeLat: TEES_BACK[4].lat, teeLng: TEES_BACK[4].lng,
    pinLat: PINS[4].lat, pinLng: PINS[4].lng,
  },
  {
    number: 15, par: 5, distanceMen: 465, distanceLadies: 442, strokeIndex: 10,
    name: "The Long One",
    description: "Longest hole on the course from these tees. Assisting wind helps but a long tee shot is needed. Avoid the Captain's Bunker right at all costs. GUR left with drop zone.",
    teeLat: TEES_BACK[5].lat, teeLng: TEES_BACK[5].lng,
    pinLat: PINS[5].lat, pinLng: PINS[5].lng,
  },
  {
    number: 16, par: 4, distanceMen: 246, distanceLadies: 232, strokeIndex: 18,
    name: "Bay View",
    description: "Short Par 4 with ocean views. Iron off the tee is smart — leaves a wedge approach. Thick bush behind the green means don't overshoot.",
    teeLat: TEES_BACK[6].lat, teeLng: TEES_BACK[6].lng,
    pinLat: PINS[6].lat, pinLng: PINS[6].lng,
  },
  {
    number: 17, par: 4, distanceMen: 314, distanceLadies: 287, strokeIndex: 8,
    name: "Golden Mile",
    description: "Into the south-easterly again. OB in Golden Mile Road right. Wind adds significant perceived distance. Large green with deep bunker left.",
    teeLat: TEES_BACK[7].lat, teeLng: TEES_BACK[7].lng,
    pinLat: PINS[7].lat, pinLng: PINS[7].lng,
  },
  {
    number: 18, par: 4, distanceMen: 330, distanceLadies: 287, strokeIndex: 4,
    name: "Homeward",
    description: "Final hole in front of the clubhouse. Tiger-line is available but risky. Centre fairway with 3-wood is sensible. OB both sides if you drift. Generous green — a great finish!",
    teeLat: TEES_BACK[8].lat, teeLng: TEES_BACK[8].lng,
    pinLat: PINS[8].lat, pinLng: PINS[8].lng,
  },
];
