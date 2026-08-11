const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "F&B Shop API Documentation",
    version: "1.0.0",
    description: "Tài liệu API chính thức cho hệ thống quản lý cửa hàng đồ ăn & thức uống (F&B Shop)"
  },
  servers: [
    {
      url: "/api/v1",
      description: "API V1 Dev Server"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Nhập mã JWT Access Token của bạn để xác thực."
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Đăng ký tài khoản mới",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "password", "email", "phone"],
                properties: {
                  fullName: { type: "string", example: "Nguyễn Văn A" },
                  email: { type: "string", example: "nguyenvana@gmail.com" },
                  phone: { type: "string", example: "0912345678" },
                  password: { type: "string", example: "12345678" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Đăng ký thành công" },
          400: { description: "Yêu cầu không hợp lệ" }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Đăng nhập hệ thống",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "nguyenvana@gmail.com" },
                  password: { type: "string", example: "12345678" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Đăng nhập thành công" },
          401: { description: "Sai thông tin tài khoản" }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Lấy thông tin tài khoản hiện tại",
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "Lấy danh sách sản phẩm",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, description: "Lọc theo Category Slug" },
          { name: "featured", in: "query", schema: { type: "boolean" }, description: "Chỉ lấy sản phẩm nổi bật" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Tìm kiếm theo tên sản phẩm" }
        ],
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Lấy chi tiết sản phẩm theo ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Thành công" },
          404: { description: "Không tìm thấy sản phẩm" }
        }
      }
    },
    "/products/{id}/reviews": {
      get: {
        tags: ["Products", "Reviews"],
        summary: "Lấy danh sách đánh giá của sản phẩm",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/orders": {
      post: {
        tags: ["Orders"],
        summary: "Tạo đơn hàng mới",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["items", "paymentMethod", "deliveryAddress", "shippingFee"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        productId: { type: "string" },
                        quantity: { type: "integer" },
                        selectedOptions: { type: "array", items: { type: "object" } }
                      }
                    }
                  },
                  paymentMethod: { type: "string", enum: ["COD", "SEPAY"] },
                  deliveryAddress: {
                    type: "object",
                    properties: {
                      fullAddress: { type: "string" },
                      lat: { type: "number" },
                      lng: { type: "number" }
                    }
                  },
                  shippingFee: { type: "number" },
                  note: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Tạo đơn hàng thành công" }
        }
      },
      get: {
        tags: ["Orders"],
        summary: "Khách hàng lấy danh sách đơn hàng của mình",
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Lấy chi tiết đơn hàng theo ID",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/orders/{id}/reviews": {
      post: {
        tags: ["Reviews"],
        summary: "Đánh giá sản phẩm trong đơn hàng giao thành công",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Order ID" }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "rating"],
                properties: {
                  productId: { type: "string" },
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  comment: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Đánh giá thành công" }
        }
      }
    },
    "/orders/{id}/status": {
      patch: {
        tags: ["Orders"],
        summary: "Cập nhật trạng thái đơn hàng (Admin & Shipper)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string" },
                  note: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Thành công" }
        }
      }
    },
    "/orders/{id}/claim": {
      patch: {
        tags: ["Shipper"],
        summary: "Shipper nhận giao đơn hàng",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          200: { description: "Nhận giao đơn hàng thành công" }
        }
      }
    },
    "/orders/reviews/admin": {
      get: {
        tags: ["Admin", "Reviews"],
        summary: "Admin lấy toàn bộ danh sách Review từ khách hàng",
        responses: {
          200: { description: "Thành công" }
        }
      }
    }
  }
};

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('Swagger API docs available at: http://localhost:4000/api-docs');
};

module.exports = setupSwagger;
