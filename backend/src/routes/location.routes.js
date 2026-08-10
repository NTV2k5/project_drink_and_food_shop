const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { requireAuth, restrictTo } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');

// Tuyến đường CRUD cho Địa điểm (Locations)
router.get('/', locationController.getAllLocations);
router.get('/:id', locationController.getLocationById);

// Admin mới được tạo, sửa, xóa các địa điểm của cửa hàng
router.post('/', requireAuth, restrictTo('ADMIN'), validateBody(['name', 'address']), locationController.createLocation);
router.put('/:id', requireAuth, restrictTo('ADMIN'), locationController.updateLocation);
router.delete('/:id', requireAuth, restrictTo('ADMIN'), locationController.deleteLocation);

module.exports = router;
