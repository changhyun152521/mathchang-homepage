const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 미들웨어
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL, // Vercel 배포 URL
].filter(Boolean); // undefined 제거

app.use(cors({
  origin: (origin, callback) => {
    // origin이 없으면 (같은 도메인 요청 등) 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS 정책에 의해 차단되었습니다'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB 연결
const connectDB = async () => {
  try {
    // 기본적으로 Atlas 주소 사용
    // MONGODB_ATLAS_URL 환경 변수가 없을 때만 로컬 주소 사용
    const defaultAtlasUri = 'mongodb+srv://ckdgusrns:a5277949@changhyunlee.px06mux.mongodb.net/mathchang';
    const mongoUri = process.env.MONGODB_ATLAS_URL || defaultAtlasUri || 'mongodb://localhost:27017/mathchang';
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB 연결 성공: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB 연결 실패:', error.message);
    process.exit(1);
  }
};

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'MathChang Server API' });
});

// API 라우트 (예시)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: '서버가 정상적으로 실행 중입니다',
    mongodb: mongoose.connection.readyState === 1 ? '연결됨' : '연결 안됨'
  });
});

// 모든 요청 로깅 (디버깅용) - 라우터 이전에 위치해야 함 (API 요청만 로깅)
app.use('/api', (req, res, next) => {
  console.log(`\n========================================`);
  console.log(`=== [${new Date().toISOString()}] ${req.method} ${req.path} ===`);
  console.log(`========================================`);
  console.log('Request URL:', req.url);
  console.log('Request IP:', req.ip);
  console.log('Request path:', req.path);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  } else {
    console.log('Request body: (empty or undefined)');
  }
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// 라우터 연결
console.log('=== 라우터 등록 시작 ===');
const usersRouter = require('./routes/users');
console.log('usersRouter 타입:', typeof usersRouter);
app.use('/api/users', usersRouter);
console.log('=== 라우터 등록 완료: /api/users ===');

const coursesRouter = require('./routes/courses');
app.use('/api/courses', coursesRouter);
console.log('=== 라우터 등록 완료: /api/courses ===');

const classesRouter = require('./routes/classes');
app.use('/api/classes', classesRouter);
console.log('=== 라우터 등록 완료: /api/classes ===');

const previewCoursesRouter = require('./routes/previewCourses');
app.use('/api/preview-courses', previewCoursesRouter);
console.log('=== 라우터 등록 완료: /api/preview-courses ===');

const classRecordsRouter = require('./routes/classRecords');
app.use('/api/class-records', classRecordsRouter);
console.log('=== 라우터 등록 완료: /api/class-records ===');

const studentRecordsRouter = require('./routes/studentRecords');
app.use('/api/student-records', studentRecordsRouter);
console.log('=== 라우터 등록 완료: /api/student-records ===');

const noticesRouter = require('./routes/notices');
app.use('/api/notices', noticesRouter);
console.log('=== 라우터 등록 완료: /api/notices ===');

const attendanceCommentsRouter = require('./routes/attendanceComments');
app.use('/api/attendance-comments', attendanceCommentsRouter);
console.log('=== 라우터 등록 완료: /api/attendance-comments ===');

// 404 핸들러
app.use((req, res) => {
  console.log(`[404] 라우트를 찾을 수 없음: ${req.method} ${req.path}`);
  console.log('Available routes: POST /api/users/login, POST /api/users/find-userid, POST /api/users/reset-password');
  res.status(404).json({ 
    error: '라우트를 찾을 수 없습니다',
    method: req.method,
    path: req.path,
    availableRoutes: [
      'POST /api/users/login',
      'POST /api/users/find-userid',
      'POST /api/users/reset-password'
    ]
  });
});

// 에러 핸들러 (4개의 파라미터 필요: err, req, res, next)
app.use((err, req, res, next) => {
  console.error('\n========================================');
  console.error('=== 서버 에러 핸들러 실행 ===');
  console.error('========================================');
  console.error('에러 타입:', err.constructor.name);
  console.error('에러 이름:', err.name);
  console.error('에러 메시지:', err.message);
  console.error('에러 스택:', err.stack);
  console.error('요청 경로:', req.path);
  console.error('요청 URL:', req.url);
  console.error('요청 메서드:', req.method);
  if (req.body && Object.keys(req.body).length > 0) {
    console.error('요청 body:', JSON.stringify(req.body, null, 2));
  }
  
  // 이미 응답이 전송되었는지 확인
  if (res.headersSent) {
    console.error('응답이 이미 전송되었습니다.');
    return next(err);
  }
  
  // Content-Type을 명시적으로 설정하고 JSON 형식으로 응답
  res.setHeader('Content-Type', 'application/json');
  
  // 에러 메시지에 "모든 필수 필드를 입력해주세요"가 포함되어 있으면 그대로 반환
  if (err.message && err.message.includes('모든 필수 필드를 입력해주세요')) {
    console.error('=== "모든 필수 필드를 입력해주세요" 에러 발생 ===');
    console.error('에러가 발생한 위치:', err.stack);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  
  return res.status(err.status || 500).json({ 
    success: false,
    error: '서버 오류가 발생했습니다',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
    console.log(`서버 주소: http://localhost:${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`포트 ${PORT}가 이미 사용 중입니다. 다른 포트를 사용하거나 실행 중인 프로세스를 종료해주세요.`);
      console.error(`포트를 변경하려면 .env 파일에 PORT=5001 (또는 다른 포트)를 설정하세요.`);
    } else {
      console.error('서버 시작 중 오류:', err);
    }
    process.exit(1);
  });
});

module.exports = app;

