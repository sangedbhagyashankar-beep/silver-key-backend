const GST_RATE = 0.12;

export const calculatePricing = (room, nights, checkIn, checkOut) => {
  const baseRate = room.price.base;
  let totalRoomCharge = 0;

  const current = new Date(checkIn);
  let nightCount = 0;
  while (current < checkOut) {
    const day = current.getDay();
    const isWeekend = day === 5 || day === 6;
    const nightRate = isWeekend && room.price.weekend ? room.price.weekend : baseRate;
    totalRoomCharge += nightRate;
    nightCount++;
    current.setDate(current.getDate() + 1);
  }

  const taxes = totalRoomCharge > 1000 * nights ? totalRoomCharge * GST_RATE : 0;
  const grandTotal = Math.round(totalRoomCharge + taxes);

  return {
    roomRate: baseRate,
    totalRoomCharge: Math.round(totalRoomCharge),
    taxes: Math.round(taxes),
    discount: 0,
    grandTotal,
    breakdown: { nights: nightCount, taxRate: `${GST_RATE * 100}%` },
  };
};
