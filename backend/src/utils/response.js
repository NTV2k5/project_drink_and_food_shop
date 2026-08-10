/**
 * API Response Utility — Standardized response format
 *
 * Chuẩn hóa tất cả response theo format nhất quán:
 * {
 *   success: boolean,
 *   message: string,
 *   data: any,
 *   meta: object (optional — for paginated results)
 * }
 */

/**
 * Gửi response thành công
 * @param {import('express').Response} res
 * @param {any} data - Dữ liệu trả về
 * @param {string} message - Thông báo
 * @param {number} statusCode - HTTP status code (mặc định 200)
 */
const success = (res, data, message = 'Thành công', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Gửi response thành công với phân trang
 * @param {import('express').Response} res
 * @param {Array} items - Danh sách dữ liệu
 * @param {object} meta - Thông tin phân trang { total, page, limit, totalPages }
 * @param {string} message - Thông báo
 */
const paginated = (res, items, meta, message = 'Thành công') => {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    meta
  });
};

/**
 * Gửi response lỗi
 * @param {import('express').Response} res
 * @param {string} message - Thông báo lỗi
 * @param {number} statusCode - HTTP status code (mặc định 500)
 * @param {any} errors - Chi tiết lỗi (optional)
 */
const error = (res, message = 'Đã xảy ra lỗi', statusCode = 500, errors = null) => {
  const body = {
    success: false,
    message
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Gửi response tạo mới thành công (201)
 */
const created = (res, data, message = 'Tạo mới thành công') => {
  return success(res, data, message, 201);
};

/**
 * Gửi response xóa thành công (200 với message)
 */
const deleted = (res, message = 'Xóa thành công') => {
  return res.status(200).json({
    success: true,
    message
  });
};

module.exports = { success, paginated, error, created, deleted };
