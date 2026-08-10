// Middleware kiểm tra dữ liệu đầu vào (Request Validation)
const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (
        req.body[field] === undefined || 
        req.body[field] === null || 
        (typeof req.body[field] === 'string' && req.body[field].trim() === '')
      ) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Dữ liệu không hợp lệ. Thiếu các trường thông tin: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  validateBody
};
