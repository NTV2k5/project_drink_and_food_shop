const axios = require('axios');

/**
 * Gọi API Nominatim của OpenStreetMap để lấy tọa độ lat/lng từ địa chỉ văn bản
 * @param {string} address Địa chỉ cần tìm tọa độ
 * @returns {Promise<{lat: number, lng: number}|null>} Tọa độ hoặc null nếu không tìm thấy
 */
const geocodeAddress = async (address) => {
  if (!address || typeof address !== 'string') return null;
  
  try {
    const url = 'https://nominatim.openstreetmap.org/search';
    
    // Thực hiện cuộc gọi HTTP GET đến OpenStreetMap Nominatim API
    const response = await axios.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        // Cần thiết lập User-Agent hợp lệ theo chính sách sử dụng của Nominatim
        'User-Agent': 'DrinkAndFoodShopApp/1.0 (university-student-project@domain.com)'
      },
      timeout: 5000 // Timeout 5 giây tránh treo ứng dụng
    });
    
    if (response.data && response.data.length > 0) {
      const firstResult = response.data[0];
      return {
        lat: parseFloat(firstResult.lat),
        lng: parseFloat(firstResult.lon)
      };
    }
    
    console.warn(`[GEOCODE] Không tìm thấy tọa độ cho địa chỉ: "${address}"`);
    return null;
  } catch (error) {
    console.error(`[GEOCODE ERROR] Lỗi định vị địa chỉ "${address}":`, error.message);
    return null;
  }
};

module.exports = {
  geocodeAddress
};
