const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const app = express();
const port = 3000;
const multer = require("multer");
// load environment variables from .env (CLOUDINARY_* vars expected)
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
require("./db.js");

// Configure Cloudinary using env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage so we can stream directly to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ được upload file hình ảnh!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String, default: "New User" },
  avatar: { type: String, default: "" },
  highScore: { type: Number, default: 0 },
});
const User = mongoose.model("User", userSchema);

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  type: {
    type: String,
    enum: ["true_false", "multiple_choice"],
    required: true,
  },
  options: [{ type: String, required: true }],
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        if (this.type === "true_false") {
          return v === "true" || v === "false";
        }
        if (this.type === "multiple_choice") {
          return v === "A" || v === "B" || v === "C" || v === "D";
        }
        return false;
      },
      message: "Đáp án đúng không hợp lệ!",
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});
const Question = mongoose.model("Question", questionSchema);

// helper to extract requesting user id from header, query or body
function getRequestingUserId(req) {
  return (req.header('x-user-id') || req.query.userId || req.body.createdBy || null);
}

async function checkAccount(username, password) {
  const user = await User.findOne({ username, password });
  if (user) {
    return { success: true, userId: user._id };
  } else {
    return { success: false, message: "Sai username hoặc password" };
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await checkAccount(username, password);
    if (result.success) {
      res.json({ message: "Đăng nhập thành công", userId: result.userId });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Lỗi server khi đăng nhập" });
  }
});

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username đã tồn tại" });
    }
    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ message: "Đăng ký thành công" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Lỗi server khi đăng ký" });
  }
});

app.get("/api/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }
    res.json({
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      highScore: user.highScore,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Lỗi server khi lấy profile" });
  }
});

// Helper to upload buffer to Cloudinary
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

app.put("/api/profile/:userId", upload.single("avatar"), async (req, res) => {
  const { userId } = req.params;
  const { displayName, highScore } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User không tồn tại" });
    }
    if (displayName) user.displayName = displayName;
    if (highScore !== undefined) user.highScore = highScore;
    if (req.file) {
      // upload to cloudinary and store secure url in DB
      const result = await uploadBufferToCloudinary(req.file.buffer, { folder: "avatars", resource_type: "image" });
      if (result && result.secure_url) {
        user.avatar = result.secure_url;
      }
    }
    await user.save();
    res.json({ message: "Cập nhật hồ sơ thành công", user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Lỗi server khi cập nhật profile" });
  }
});

app.get("/api/questions", async (req, res) => {
  const userId = getRequestingUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized: missing user id" });
  try {
    const questions = await Question.find({ createdBy: userId }).sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    console.error("Error loading questions:", err);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách câu hỏi" });
  }
});

app.get("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  const userId = getRequestingUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized: missing user id" });
  try {
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Không tìm thấy câu hỏi" });
    }
    if (!question.createdBy.equals(userId)) {
      return res.status(403).json({ error: "Forbidden: bạn không có quyền xem câu hỏi này" });
    }
    res.json(question);
  } catch (err) {
    console.error("Error loading question:", err);
    res.status(500).json({ error: "Lỗi server khi lấy câu hỏi" });
  }
});

app.post("/api/questions", async (req, res) => {
  const { questionText, type, options, correctAnswer } = req.body;
  // prefer header/query user id to avoid client spoofing
  const userId = getRequestingUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized: missing user id" });
  console.log("Received payload (creating by):", userId, req.body);
  try {
    const newQuestion = new Question({
      questionText,
      type,
      options,
      correctAnswer,
      createdBy: userId,
    });
    await newQuestion.save();
    res.json({ message: "Thêm câu hỏi thành công!", question: newQuestion });
  } catch (err) {
    console.error("Error adding question:", err);
    res.status(500).json({ error: "Lỗi server khi thêm câu hỏi" });
  }
});

app.put("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  const { questionText, type, options, correctAnswer } = req.body;
  console.log("Update payload:", req.body);
  try {
    const userId = getRequestingUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized: missing user id" });

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Không tìm thấy câu hỏi" });
    }
    if (!question.createdBy.equals(userId)) {
      return res.status(403).json({ error: "Forbidden: bạn không có quyền cập nhật câu hỏi này" });
    }
    question.questionText = questionText;
    question.type = type;
    question.options = options;
    question.correctAnswer = correctAnswer;
    await question.save();
    res.json({ message: "Cập nhật câu hỏi thành công!", question });
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ error: "Lỗi server khi cập nhật câu hỏi" });
  }
});

app.get("/api/questions/:id", async (req, res) => {
  const { id } = req.params;
  // Kiểm tra id có phải ObjectId hợp lệ không
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID không hợp lệ" });
  }
  try {
    const userId = getRequestingUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized: missing user id" });

    const q = await Question.findById(id);
    if (!q) {
      return res.status(404).json({ error: "Không tìm thấy câu hỏi" });
    }
    if (!q.createdBy.equals(userId)) {
      return res.status(403).json({ error: "Forbidden: bạn không có quyền xem câu hỏi này" });
    }
    res.json(q);
  } catch (err) {
    console.error("Error get question:", err);
    res.status(500).json({ error: "Lỗi server khi lấy câu hỏi" });
  }
});



// Route xóa câu hỏi
app.delete("/api/questions/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.warn(`Invalid question ID: ${id}`);
    return res.status(400).json({ error: "ID không hợp lệ" });
  }

  try {
    const userId = getRequestingUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized: missing user id" });

    const question = await Question.findById(id);
    if (!question) {
      console.warn(`Question not found for deletion. ID: ${id}`);
      return res.status(404).json({ error: "Không tìm thấy câu hỏi để xóa" });
    }
    if (!question.createdBy.equals(userId)) {
      return res.status(403).json({ error: "Forbidden: bạn không có quyền xóa câu hỏi này" });
    }

    await Question.findByIdAndDelete(id);
    console.log(`Question deleted successfully. ID: ${id}, Text: ${question.questionText}`);
    res.json({ message: "Xóa câu hỏi thành công!" });
  } catch (err) {
    console.error("Error while deleting question:", err);
    res.status(500).json({ error: "Lỗi server khi xóa câu hỏi" });
  }
});



app.get("/", (req, res) => {
  res.redirect("/login.html");
});


app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
