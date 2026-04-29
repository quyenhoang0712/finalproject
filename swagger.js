const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MERN API",
      version: "1.0.0",
      description: "API documentation for MERN project",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
    tags: [
      { name: "Users", description: "User APIs" },
      { name: "Courses", description: "Course APIs" },
      { name: "Classes", description: "Class APIs" },
      { name: "Enrollments", description: "Enrollment APIs" },
      { name: "Schedules", description: "Schedule APIs" },
      { name: "Attendances", description: "Attendance APIs" },
      { name: "Payments", description: "Payment APIs" },
      { name: "Dashboard", description: "Dashboard APIs" },
      { name: "Reports", description: "Report APIs" },
      { name: "Assignments", description: "Assignment APIs" },
      { name: "Materials", description: "Material APIs" },
      { name: "Online Classes", description: "Online class APIs" },
      { name: "Feedbacks", description: "Feedback APIs" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["fullName", "email", "password", "role"],
          properties: {
            _id: { type: "string", example: "680123456789abcdef123456" },
            fullName: { type: "string", example: "Nguyen Van A" },
            email: { type: "string", example: "user@gmail.com" },
            password: { type: "string", example: "123456" },
            role: {
              type: "string",
              enum: ["student", "teacher", "admin", "parent"],
              example: "student",
            },
          },
        },

        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              example: "admin@gmail.com",
            },
            password: {
              type: "string",
              example: "123456",
            },
          },
        },

        Course: {
          type: "object",
          required: ["title", "subject", "price"],
          properties: {
            _id: { type: "string", example: "680123456789abcdef111111" },
            title: { type: "string", example: "IELTS Basic" },
            description: { type: "string", example: "Khóa học IELTS cơ bản" },
            subject: { type: "string", example: "English" },
            price: { type: "number", example: 5000000 },
            duration: { type: "string", example: "3 months" },
            mode: {
              type: "string",
              enum: ["online", "offline", "hybrid"],
              example: "online",
            },
            isActive: { type: "boolean", example: true },
          },
        },

        Class: {
          type: "object",
          required: [
            "className",
            "courseId",
            "teacherId",
            "schedule",
            "startDate",
            "endDate",
            "capacity",
          ],
          properties: {
            _id: { type: "string", example: "680123456789abcdef222222" },
            className: {
              type: "string",
              example: "IELTS Basic - Evening Class",
            },
            courseId: {
              type: "string",
              example: "680123456789abcdef111111",
            },
            teacherId: {
              type: "string",
              example: "680123456789abcdef333333",
            },
            schedule: {
              type: "string",
              example: "Mon-Wed-Fri 19:00-21:00",
            },
            room: {
              type: "string",
              example: "Google Meet",
            },
            learningMode: {
              type: "string",
              enum: ["online", "offline", "hybrid"],
              example: "online",
            },
            startDate: {
              type: "string",
              format: "date-time",
              example: "2026-05-01T00:00:00.000Z",
            },
            endDate: {
              type: "string",
              format: "date-time",
              example: "2026-08-01T00:00:00.000Z",
            },
            capacity: {
              type: "number",
              example: 30,
            },
            currentStudents: {
              type: "number",
              example: 0,
            },
            status: {
              type: "string",
              enum: ["upcoming", "ongoing", "completed"],
              example: "upcoming",
            },
          },
        },

        Enrollment: {
          type: "object",
          required: ["studentId", "classId"],
          properties: {
            _id: { type: "string", example: "680123456789abcdef444444" },
            studentId: { type: "string", example: "680123456789abcdef555555" },
            classId: { type: "string", example: "680123456789abcdef222222" },
            parentId: { type: "string", example: "680123456789abcdef666666" },
            enrollDate: {
              type: "string",
              format: "date-time",
              example: "2026-05-02T00:00:00.000Z",
            },
            status: {
              type: "string",
              enum: ["pending", "approved", "cancelled"],
              example: "pending",
            },
            paymentStatus: {
              type: "string",
              enum: ["unpaid", "paid"],
              example: "unpaid",
            },
          },
        },

        Schedule: {
          type: "object",
          required: ["classId", "date", "startTime", "endTime"],
          properties: {
            _id: { type: "string", example: "680123456789abcdef888888" },
            classId: { type: "string", example: "680123456789abcdef222222" },
            date: {
              type: "string",
              format: "date-time",
              example: "2026-05-01T00:00:00.000Z",
            },
            startTime: { type: "string", example: "19:00" },
            endTime: { type: "string", example: "21:00" },
            room: { type: "string", example: "Google Meet" },
            status: {
              type: "string",
              enum: ["scheduled", "completed", "cancelled"],
              example: "scheduled",
            },
            note: { type: "string", example: "Buổi học đầu tiên" },
          },
        },

        Attendance: {
          type: "object",
          required: ["scheduleId", "studentId"],
          properties: {
            _id: { type: "string", example: "680123456789abcdef777777" },
            scheduleId: { type: "string", example: "680123456789abcdef888888" },
            studentId: { type: "string", example: "680123456789abcdef999999" },
            status: {
              type: "string",
              enum: ["present", "absent", "late"],
              example: "present",
            },
            note: {
              type: "string",
              example: "Đến muộn 10 phút",
            },
          },
        },

        Payment: {
          type: "object",
          required: ["studentId", "classId", "enrollmentId", "amount"],
          properties: {
            _id: { type: "string", example: "680123456789abcdefaaaaaa" },
            studentId: { type: "string", example: "680123456789abcdef555555" },
            parentId: { type: "string", example: "680123456789abcdef666666" },
            classId: { type: "string", example: "680123456789abcdef222222" },
            enrollmentId: { type: "string", example: "680123456789abcdef444444" },
            amount: { type: "number", example: 5000000 },
            paymentMethod: {
              type: "string",
              enum: ["cash", "bank_transfer", "momo", "zalopay"],
              example: "bank_transfer",
            },
            status: {
              type: "string",
              enum: ["pending", "paid", "failed"],
              example: "paid",
            },
            paidAt: {
              type: "string",
              format: "date-time",
              example: "2026-05-03T10:00:00.000Z",
            },
            note: {
              type: "string",
              example: "Đóng học phí đợt 1",
            },
          },
        },

        DashboardSummary: {
          type: "object",
          properties: {
            totalUsers: { type: "number", example: 10 },
            totalCourses: { type: "number", example: 5 },
            totalClasses: { type: "number", example: 3 },
            totalEnrollments: { type: "number", example: 20 },
            totalSchedules: { type: "number", example: 50 },
            totalAttendances: { type: "number", example: 200 },
            totalPayments: { type: "number", example: 15 },
            paidPayments: { type: "number", example: 10 },
            totalRevenue: { type: "number", example: 30000000 },
          },
        },

        ReportOverview: {
          type: "object",
          properties: {
            revenueByMonth: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: {
                    type: "object",
                    properties: {
                      year: { type: "number", example: 2026 },
                      month: { type: "number", example: 4 },
                    },
                  },
                  total: { type: "number", example: 5000000 },
                },
              },
            },
            studentsByClass: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: {
                    type: "string",
                    example: "680123456789abcdef222222",
                  },
                  totalStudents: { type: "number", example: 25 },
                },
              },
            },
            attendanceStats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string", example: "present" },
                  total: { type: "number", example: 150 },
                },
              },
            },
            paymentStats: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string", example: "paid" },
                  total: { type: "number", example: 12 },
                },
              },
            },
          },
        },

        AssignmentInput: {
          type: "object",
          required: ["title", "classId", "dueDate"],
          properties: {
            title: { type: "string", example: "Homework 1" },
            description: { type: "string", example: "Solve exercises 1-10" },
            classId: { type: "string", example: "680123456789abcdef222222" },
            dueDate: { type: "string", format: "date", example: "2026-05-30" },
            maxScore: { type: "number", example: 100 },
            fileName: { type: "string", example: "homework.pdf" },
            fileType: { type: "string", example: "application/pdf" },
            fileSize: { type: "number", example: 102400 },
            fileData: { type: "string", example: "data:application/pdf;base64,..." },
          },
        },

        AssignmentSubmissionInput: {
          type: "object",
          properties: {
            content: { type: "string", example: "My answer note" },
            fileName: { type: "string", example: "answer.pdf" },
            fileType: { type: "string", example: "application/pdf" },
            fileSize: { type: "number", example: 204800 },
            fileData: { type: "string", example: "data:application/pdf;base64,..." },
          },
        },

        GradeSubmissionInput: {
          type: "object",
          required: ["score"],
          properties: {
            score: { type: "number", example: 85 },
            feedback: { type: "string", example: "Good work" },
          },
        },

        MaterialInput: {
          type: "object",
          required: ["title", "classId", "fileName", "fileData"],
          properties: {
            title: { type: "string", example: "Lesson slides" },
            description: { type: "string", example: "Slides for chapter 1" },
            classId: { type: "string", example: "680123456789abcdef222222" },
            fileName: { type: "string", example: "lesson-1.pdf" },
            fileType: { type: "string", example: "application/pdf" },
            fileSize: { type: "number", example: 512000 },
            fileData: { type: "string", example: "data:application/pdf;base64,..." },
          },
        },

        PeerInput: {
          type: "object",
          required: ["peerId"],
          properties: {
            peerId: { type: "string", example: "peer_abc123" },
          },
        },

        MessageInput: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", example: "Hello class" },
          },
        },

        SignalInput: {
          type: "object",
          required: ["fromPeerId", "toPeerId", "type", "payload"],
          properties: {
            fromPeerId: { type: "string", example: "peer_teacher" },
            toPeerId: { type: "string", example: "peer_student" },
            type: { type: "string", enum: ["offer", "answer", "candidate"], example: "offer" },
            payload: { type: "object", example: { sdp: "..." } },
          },
        },

        MicPermissionInput: {
          type: "object",
          required: ["userId", "allowed"],
          properties: {
            userId: { type: "string", example: "680123456789abcdef999999" },
            allowed: { type: "boolean", example: true },
          },
        },

        FeedbackInput: {
          type: "object",
          required: ["classId", "punctuality", "teachingClarity", "contentFit", "supportiveness"],
          properties: {
            classId: { type: "string", example: "680123456789abcdef222222" },
            studentId: { type: "string", example: "680123456789abcdef999999" },
            punctuality: { type: "string", enum: ["yes", "sometimes", "no"], example: "yes" },
            teachingClarity: { type: "string", enum: ["yes", "sometimes", "no"], example: "yes" },
            contentFit: { type: "string", enum: ["yes", "sometimes", "no"], example: "sometimes" },
            supportiveness: { type: "string", enum: ["yes", "sometimes", "no"], example: "yes" },
            comment: { type: "string", example: "Teacher explains clearly." },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Dữ liệu không hợp lệ",
            },
          },
        },
      },
    },

    paths: {
      "/api/users": {
        get: {
          tags: ["Users"],
          summary: "Lấy danh sách user",
          responses: {
            200: { description: "OK" },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Tạo user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          responses: {
            201: { description: "Tạo thành công" },
          },
        },
      },

      "/api/users/login": {
        post: {
          tags: ["Users"],
          summary: "Đăng nhập",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginInput",
                },
              },
            },
          },
          responses: {
            200: { description: "Đăng nhập thành công" },
            400: { description: "Sai email hoặc mật khẩu" },
          },
        },
      },

      "/api/users/profile/me": {
        get: {
          tags: ["Users"],
          summary: "Thông tin user đang login",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            401: { description: "Không có token" },
          },
        },
      },

      "/api/users/admin-only": {
        get: {
          tags: ["Users"],
          summary: "Chỉ admin",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Lấy user theo id",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Update user",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
          },
        },
        delete: {
          tags: ["Users"],
          summary: "Delete user",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
          },
        },
      },

      "/api/courses": {
        get: {
          tags: ["Courses"],
          summary: "Lấy danh sách course",
          responses: {
            200: { description: "OK" },
          },
        },
        post: {
          tags: ["Courses"],
          summary: "Tạo course (admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Course",
                },
              },
            },
          },
          responses: {
            201: { description: "Created" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/courses/{id}": {
        get: {
          tags: ["Courses"],
          summary: "Lấy course theo id",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Courses"],
          summary: "Cập nhật course",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Course",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
          },
        },
        delete: {
          tags: ["Courses"],
          summary: "Xóa course",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
          },
        },
      },

      "/api/classes": {
        get: {
          tags: ["Classes"],
          summary: "Lấy danh sách class",
          responses: {
            200: { description: "OK" },
          },
        },
        post: {
          tags: ["Classes"],
          summary: "Tạo class (admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Class",
                },
              },
            },
          },
          responses: {
            201: { description: "Tạo thành công" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/classes/{id}": {
        get: {
          tags: ["Classes"],
          summary: "Lấy class theo id",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Classes"],
          summary: "Cập nhật class (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Class",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
            403: { description: "Không có quyền" },
          },
        },
        delete: {
          tags: ["Classes"],
          summary: "Xóa class (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/enrollments": {
        get: {
          tags: ["Enrollments"],
          summary: "Lấy danh sách enrollment (admin)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
          },
        },
        post: {
          tags: ["Enrollments"],
          summary: "Tạo enrollment",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Enrollment",
                },
              },
            },
          },
          responses: {
            201: { description: "Tạo thành công" },
            400: { description: "Dữ liệu không hợp lệ" },
          },
        },
      },

      "/api/enrollments/{id}": {
        get: {
          tags: ["Enrollments"],
          summary: "Lấy enrollment theo id",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Enrollments"],
          summary: "Cập nhật enrollment (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Enrollment",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
            403: { description: "Không có quyền" },
          },
        },
        delete: {
          tags: ["Enrollments"],
          summary: "Xóa enrollment (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/schedules": {
        get: {
          tags: ["Schedules"],
          summary: "Lấy danh sách schedule",
          responses: {
            200: { description: "OK" },
          },
        },
        post: {
          tags: ["Schedules"],
          summary: "Tạo schedule (admin)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Schedule",
                },
              },
            },
          },
          responses: {
            201: { description: "Created" },
          },
        },
      },

      "/api/schedules/{id}": {
        get: {
          tags: ["Schedules"],
          summary: "Lấy schedule theo id",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
          },
        },
        put: {
          tags: ["Schedules"],
          summary: "Update schedule",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Schedule",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
          },
        },
        delete: {
          tags: ["Schedules"],
          summary: "Delete schedule",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
          },
        },
      },

      "/api/attendances": {
        get: {
          tags: ["Attendances"],
          summary: "Lấy danh sách attendance",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
          },
        },
        post: {
          tags: ["Attendances"],
          summary: "Tạo attendance",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Attendance",
                },
              },
            },
          },
          responses: {
            201: { description: "Tạo thành công" },
            400: { description: "Dữ liệu không hợp lệ" },
          },
        },
      },

      "/api/attendances/{id}": {
        get: {
          tags: ["Attendances"],
          summary: "Lấy attendance theo id",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Not found" },
          },
        },
        put: {
          tags: ["Attendances"],
          summary: "Cập nhật attendance",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Attendance",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
            403: { description: "Không có quyền" },
          },
        },
        delete: {
          tags: ["Attendances"],
          summary: "Xóa attendance (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/attendances/schedule/{scheduleId}": {
        get: {
          tags: ["Attendances"],
          summary: "Lấy attendance theo schedule",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "scheduleId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/payments": {
        get: {
          tags: ["Payments"],
          summary: "Lấy danh sách payment (admin)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
          },
        },

        post: {
          tags: ["Payments"],
          summary: "Tạo payment",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Payment",
                },
              },
            },
          },
          responses: {
            201: { description: "Tạo thành công" },
            400: { description: "Dữ liệu không hợp lệ" },
          },
        },
      },

      "/api/payments/{id}": {
        get: {
          tags: ["Payments"],
          summary: "Lấy payment theo id",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Not found" },
          },
        },

        put: {
          tags: ["Payments"],
          summary: "Cập nhật payment (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Payment",
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
            403: { description: "Không có quyền" },
          },
        },

        delete: {
          tags: ["Payments"],
          summary: "Xóa payment (admin)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Deleted" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/payments/{id}/bank-transfer": {
        post: {
          tags: ["Payments"],
          summary: "Gửi thông tin chuyển khoản học phí",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    note: { type: "string", example: "Đã chuyển khoản từ VCB" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "OK" },
            404: { description: "Payment not found" },
          },
        },
      },

      "/api/attendances/schedule/{scheduleId}/roster": {
        get: {
          tags: ["Attendances"],
          summary: "Lấy danh sách học viên và điểm danh theo buổi học",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "scheduleId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
            404: { description: "Schedule not found" },
          },
        },
      },

      "/api/attendances/schedule/{scheduleId}/student/{studentId}": {
        put: {
          tags: ["Attendances"],
          summary: "Tạo hoặc cập nhật điểm danh cho một học viên",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "scheduleId", required: true, schema: { type: "string" } },
            { in: "path", name: "studentId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["present", "late", "absent"], example: "present" },
                    note: { type: "string", example: "Đi học đúng giờ" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Updated" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/assignments/student": {
        get: {
          tags: ["Assignments"],
          summary: "Học viên xem bài tập của mình",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/assignments/teacher": {
        get: {
          tags: ["Assignments"],
          summary: "Giáo viên xem bài tập đã tạo",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/assignments/parent": {
        get: {
          tags: ["Assignments"],
          summary: "Phụ huynh xem bài tập của con",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/assignments": {
        post: {
          tags: ["Assignments"],
          summary: "Giáo viên tạo bài tập",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AssignmentInput" } } },
          },
          responses: {
            201: { description: "Created" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/assignments/{id}": {
        delete: {
          tags: ["Assignments"],
          summary: "Giáo viên xóa bài tập",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Deleted" },
            404: { description: "Assignment not found" },
          },
        },
      },

      "/api/assignments/{id}/submit": {
        post: {
          tags: ["Assignments"],
          summary: "Học viên nộp bài",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/AssignmentSubmissionInput" } } },
          },
          responses: {
            200: { description: "Submitted" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/assignments/{assignmentId}/submissions/{submissionId}/grade": {
        put: {
          tags: ["Assignments"],
          summary: "Giáo viên chấm điểm bài nộp",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "assignmentId", required: true, schema: { type: "string" } },
            { in: "path", name: "submissionId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/GradeSubmissionInput" } } },
          },
          responses: {
            200: { description: "Graded" },
            400: { description: "Invalid score" },
            404: { description: "Not found" },
          },
        },
      },

      "/api/materials/student": {
        get: {
          tags: ["Materials"],
          summary: "Học viên xem tài liệu",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/materials/teacher": {
        get: {
          tags: ["Materials"],
          summary: "Giáo viên xem tài liệu đã đăng",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/materials": {
        post: {
          tags: ["Materials"],
          summary: "Giáo viên đăng tài liệu",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/MaterialInput" } } },
          },
          responses: {
            201: { description: "Created" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/materials/{id}": {
        delete: {
          tags: ["Materials"],
          summary: "Giáo viên xóa tài liệu",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Deleted" },
            404: { description: "Material not found" },
          },
        },
      },

      "/api/feedbacks/mine": {
        get: {
          tags: ["Feedbacks"],
          summary: "Học viên/phụ huynh xem feedback đã gửi",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/feedbacks/teacher": {
        get: {
          tags: ["Feedbacks"],
          summary: "Giáo viên xem feedback nhận được",
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: "OK" }, 403: { description: "Không có quyền" } },
        },
      },

      "/api/feedbacks": {
        post: {
          tags: ["Feedbacks"],
          summary: "Học viên/phụ huynh gửi feedback",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/FeedbackInput" } } },
          },
          responses: {
            201: { description: "Created" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/online-classes": {
        get: {
          tags: ["Online Classes"],
          summary: "Lấy danh sách lịch học online theo vai trò",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/online-classes/{scheduleId}/open": {
        post: {
          tags: ["Online Classes"],
          summary: "Giáo viên mở lớp online theo lịch học",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "scheduleId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Opened" },
            400: { description: "Not class time" },
            403: { description: "Không có quyền" },
            404: { description: "Schedule not found" },
          },
        },
      },

      "/api/online-classes/{sessionId}/end": {
        post: {
          tags: ["Online Classes"],
          summary: "Giáo viên kết thúc lớp online",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Ended" },
            403: { description: "Không có quyền" },
            404: { description: "Online class not found" },
          },
        },
      },

      "/api/online-classes/{sessionId}/join": {
        post: {
          tags: ["Online Classes"],
          summary: "Tham gia lớp online",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PeerInput" } } },
          },
          responses: {
            200: { description: "Joined" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
            404: { description: "Online class is not live" },
          },
        },
      },

      "/api/online-classes/{sessionId}/heartbeat": {
        post: {
          tags: ["Online Classes"],
          summary: "Cập nhật trạng thái đang online",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Online class not found" },
          },
        },
      },

      "/api/online-classes/{sessionId}/leave": {
        post: {
          tags: ["Online Classes"],
          summary: "Rời lớp online",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "OK" },
            404: { description: "Online class not found" },
          },
        },
      },

      "/api/online-classes/{sessionId}/state": {
        get: {
          tags: ["Online Classes"],
          summary: "Lấy trạng thái realtime của lớp online",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
            { in: "query", name: "since", required: false, schema: { type: "string", format: "date-time" } },
            { in: "query", name: "peerId", required: false, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
            404: { description: "Online class not found" },
          },
        },
      },

      "/api/online-classes/{sessionId}/message": {
        post: {
          tags: ["Online Classes"],
          summary: "Gửi tin nhắn trong lớp online",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/MessageInput" } } },
          },
          responses: {
            201: { description: "Created" },
            400: { description: "Invalid data" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/online-classes/{sessionId}/signal": {
        post: {
          tags: ["Online Classes"],
          summary: "Gửi tín hiệu WebRTC",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/SignalInput" } } },
          },
          responses: {
            201: { description: "Created" },
            400: { description: "Invalid signal" },
            403: { description: "Không có quyền" },
          },
        },
      },

      "/api/online-classes/{sessionId}/speak-request": {
        post: {
          tags: ["Online Classes"],
          summary: "Học viên/phụ huynh xin phát biểu",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "OK" },
            403: { description: "Chưa tham gia lớp" },
            404: { description: "Online class is not live" },
          },
        },
      },

      "/api/online-classes/{sessionId}/mic-permission": {
        post: {
          tags: ["Online Classes"],
          summary: "Giáo viên bật/tắt quyền micro",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "sessionId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/MicPermissionInput" } } },
          },
          responses: {
            200: { description: "OK" },
            403: { description: "Không có quyền" },
            404: { description: "Not found" },
          },
        },
      },

      "/api/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Lấy dữ liệu tổng quan dashboard",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Lấy dashboard summary thành công",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/DashboardSummary",
                  },
                },
              },
            },
            401: { description: "Chưa đăng nhập" },
            403: { description: "Không có quyền" },
            500: { description: "Lỗi server" },
          },
        },
      },

      "/api/reports/overview": {
        get: {
          tags: ["Reports"],
          summary: "Lấy dữ liệu tổng quan report",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Lấy report overview thành công",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ReportOverview",
                  },
                },
              },
            },
            401: { description: "Chưa đăng nhập" },
            403: { description: "Không có quyền" },
            500: { description: "Lỗi server" },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
