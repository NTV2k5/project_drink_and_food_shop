const Location = require('../models/Location');
const { geocodeAddress } = require('../services/geocoding');
const { ApiError } = require('../middleware/errorHandler');

// Tạo địa điểm mới và tự động lấy tọa độ qua Geocoding API ngoài
const createLocation = async (req, res, next) => {
  try {
    const { name, address, latitude, longitude, description, phone, isActive } = req.body;

    let finalLat = latitude;
    let finalLng = longitude;

    // Nếu không truyền tọa độ đầu vào, thực hiện gọi API ngoài để lấy lat/lng
    if (finalLat === undefined || finalLng === undefined || finalLat === null || finalLng === null) {
      console.log(`[GEOCODING] Đang định vị địa chỉ: "${address}"...`);
      const coords = await geocodeAddress(address);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
        console.log(`[GEOCODING] Thành công: lat=${finalLat}, lng=${finalLng}`);
      } else {
        console.warn(`[GEOCODING] Không tự động xác định được tọa độ, dùng tọa độ mặc định (TP.HCM)`);
        // Tọa độ mặc định (Ví dụ Trung tâm TP.HCM: 10.7769, 106.7009)
        finalLat = 10.7769;
        finalLng = 106.7009;
      }
    }

    const location = await Location.create({
      name,
      address,
      latitude: finalLat,
      longitude: finalLng,
      description,
      phone,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Thêm địa điểm thành công.',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách toàn bộ địa điểm
const getAllLocations = async (req, res, next) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
};

// Lấy chi tiết một địa điểm
const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const location = await Location.findById(id);
    
    if (!location) {
      throw new ApiError(404, `Không tìm thấy địa điểm có ID: ${id}`);
    }
    
    res.status(200).json(location);
  } catch (error) {
    next(error);
  }
};

// Cập nhật địa điểm (Nếu thay đổi địa chỉ sẽ tự động định vị lại)
const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    const oldLocation = await Location.findById(id);
    if (!oldLocation) {
      throw new ApiError(404, `Không tìm thấy địa điểm có ID: ${id}`);
    }

    // Nếu thay đổi địa chỉ và không truyền tọa độ mới, gọi lại Geocoding API
    if (updates.address && updates.address !== oldLocation.address) {
      if (updates.latitude === undefined && updates.longitude === undefined) {
        console.log(`[GEOCODING] Địa chỉ thay đổi. Đang cập nhật lại tọa độ cho: "${updates.address}"...`);
        const coords = await geocodeAddress(updates.address);
        if (coords) {
          updates.latitude = coords.lat;
          updates.longitude = coords.lng;
        }
      }
    }

    const location = await Location.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật địa điểm thành công.',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

// Xóa địa điểm
const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const location = await Location.findByIdAndDelete(id);
    if (!location) {
      throw new ApiError(404, `Không tìm thấy địa điểm có ID: ${id}`);
    }

    res.status(200).json({
      success: true,
      message: 'Xóa địa điểm thành công.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation
};
