export const getAddressFromCoords = async (lat: number, lon: number): Promise<string> => {
  try {
    // Add accept-language to URL params to enforce Traditional Chinese response
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=zh-TW`,
      {
        headers: {
          'User-Agent': 'SmartCrossroadControl/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch address');
    }

    const data = await response.json();
    const addr = data.address;
    
    if (addr) {
      // 1. Try to return explicit junction name if available (e.g. from a traffic signal node)
      if (addr.junction) {
         return addr.junction;
      }

      // 2. Standard Taiwan Address formatting: City + District + Road
      // Nominatim mapping:
      // City/County -> 縣市
      // District/Town/Suburb -> 鄉鎮市區
      // Road/Pedestrian -> 路名
      
      const city = addr.city || addr.county || '';
      const district = addr.district || addr.town || addr.suburb || '';
      const road = addr.road || addr.pedestrian || addr.footway || addr.cycleway || '';
      
      // If we have a valid road name, return the structured address
      // This provides a clean base string like "臺北市信義區信義路五段"
      // Users can easily append "與松智路口" manually.
      if (road) {
        return `${city}${district}${road}`;
      }
      
      // 3. Fallback to POI name (Building, Landmark)
      if (addr.amenity || addr.building || addr.landmark) {
         return `${city}${district}${addr.amenity || addr.building || addr.landmark}`;
      }
    }
    
    // 4. Last resort: split the full display name
    // Usually formatted as "Name, Road, District, City..."
    return data.display_name?.split(',')[0] || "未知地點";
    
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
};