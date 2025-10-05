/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 프로필 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/user/exchanges:
 *   get:
 *     summary: 연결된 거래소 목록 조회
 *     tags: [Exchange]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 거래소 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   exchangeName:
 *                     type: string
 *                   isActive:
 *                     type: boolean
 */

/**
 * @swagger
 * /api/user/exchanges:
 *   post:
 *     summary: 거래소 연결
 *     tags: [Exchange]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exchangeName
 *               - apiKey
 *               - secretKey
 *             properties:
 *               exchangeName:
 *                 type: string
 *                 enum: [BINANCE, BYBIT, OKX, UPBIT, BITHUMB]
 *               apiKey:
 *                 type: string
 *               secretKey:
 *                 type: string
 *     responses:
 *       201:
 *         description: 거래소 연결 성공
 *       400:
 *         description: 잘못된 요청
 */

/**
 * @swagger
 * /api/active-positions:
 *   get:
 *     summary: 활성 포지션 조회
 *     tags: [Position]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 활성 포지션 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activePositions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Position'
 *                 activePositionCount:
 *                   type: integer
 *                 tradingStats:
 *                   type: object
 *                   properties:
 *                     totalTrades:
 *                       type: integer
 *                     openTrades:
 *                       type: integer
 *                     closedTrades:
 *                       type: integer
 *                     totalProfit:
 *                       type: number
 */

/**
 * @swagger
 * /api/strategy:
 *   get:
 *     summary: 트레이딩 전략 조회
 *     tags: [Strategy]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 전략 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Strategy'
 */

/**
 * @swagger
 * /api/strategy:
 *   post:
 *     summary: 트레이딩 전략 생성/업데이트
 *     tags: [Strategy]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               targetCoins:
 *                 type: array
 *                 items:
 *                   type: string
 *               minPremium:
 *                 type: number
 *                 minimum: 0
 *               maxLeverage:
 *                 type: number
 *                 minimum: 1
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 전략 저장 성공
 */

/**
 * @swagger
 * /api/premium-ticker:
 *   get:
 *     summary: 김치 프리미엄 티커 조회
 *     tags: [Position]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: 프리미엄 티커 데이터
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   symbol:
 *                     type: string
 *                   korean_ex:
 *                     type: string
 *                   foreign_ex:
 *                     type: string
 *                   premium:
 *                     type: number
 *                   kr_price:
 *                     type: number
 *                   fr_price:
 *                     type: number
 */

/**
 * @swagger
 * /api/payments/plans:
 *   get:
 *     summary: 사용 가능한 플랜 목록 조회
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: 플랜 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                   features:
 *                     type: array
 *                     items:
 *                       type: string
 */

/**
 * @swagger
 * /api/proxy:
 *   get:
 *     summary: 외부 API 프록시
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: 프록시할 URL
 *     responses:
 *       200:
 *         description: 프록시 응답
 */
