const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const app = express();

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const classRoutes = require("./routes/classRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const studentRoutes = require("./routes/studentRoutes");
const parentRoutes = require("./routes/parentRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const materialRoutes = require("./routes/materialRoutes");
const onlineClassRoutes = require("./routes/onlineClassRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

const clientDistPath = path.join(__dirname, "../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const clientDevUrl = process.env.CLIENT_DEV_URL || "http://localhost:5173";

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/online-classes", onlineClassRoutes);
app.use("/api/feedbacks", feedbackRoutes);

app.use(express.static(clientDistPath));

const sendReactApp = (req, res) => {
  if (fs.existsSync(clientIndexPath)) {
    return res.sendFile(clientIndexPath);
  }

  return res.redirect(`${clientDevUrl}${req.originalUrl === "/" ? "" : req.originalUrl}`);
};

app.get("/", sendReactApp);

app.get("/login", sendReactApp);

app.get("/admin", sendReactApp);

app.get("/admin.html", (req, res) => {
  res.redirect("/admin");
});

app.get("/teacher", sendReactApp);

app.get("/teacher.html", (req, res) => {
  res.redirect("/teacher");
});

app.get("/student", sendReactApp);

app.get("/student.html", (req, res) => {
  res.redirect("/student");
});

app.get("/parent", sendReactApp);

app.get("/parent.html", (req, res) => {
  res.redirect("/parent");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    app.listen(5000, () => {
      console.log("Server running at: http://localhost:5000");
      console.log("Swagger docs: http://localhost:5000/api-docs");
      if (!fs.existsSync(clientIndexPath)) {
        console.log("Client dist not found. Start Vite with: npm run client");
        console.log(`Frontend dev URL: ${clientDevUrl}`);
      }
    });
  })
  .catch((err) => console.log(err));
