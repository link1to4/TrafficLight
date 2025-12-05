export const getAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'zh-TW,en;q=0.9', // Prefer Traditional Chinese
          'User-Agent': 'SmartCrossroadControl/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch address');
    }

    const data = await response.json();
    
    // Construct a meaningful name from address parts
    const addr = data.address;
    if (addr) {
      const road = addr.road || '';
      const suburb = addr.suburb || addr.district || '';
      const city = addr.city || addr.county || '';
      
      if (road) return `${city}${suburb} ${road}`;
      return data.display_name.split(',')[0];
    }
    
    return "未知地點";
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
};