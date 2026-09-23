const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const path = require('path');

describe('Chess JEV App Backend Unit Tests', () => {
  
  test('1. Test JEV connection endpoint returns gateway status', async () => {
    const response = await request(app).get('/api/jev-test');
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.gateway).toBeDefined();
  });

  test('2. Test JEV reactive move generation endpoint with initial FEN', async () => {
    const initialFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const response = await request(app)
      .post('/api/jev-move')
      .send({ fen: initialFen });
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('from');
    expect(response.body).toHaveProperty('to');
    expect(response.body).toHaveProperty('san');
    expect(response.body).toHaveProperty('confidence');
  });

  test('3. Test Game Analytics Logging creates and appends to game_logs.json', async () => {
    const mockGame = {
      username: 'TestUser',
      mode: '3 Min Blitz',
      result: 'Victory',
      timeLeft: '2m 10s'
    };

    const response = await request(app)
      .post('/api/save-game')
      .send(mockGame);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const logPath = path.join(__dirname, '../game_logs.json');
    expect(fs.existsSync(logPath)).toBe(true);
    
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    expect(Array.isArray(logs)).toBe(true);
    const lastLog = logs[logs.length - 1];
    expect(lastLog.username).toBe('TestUser');
    expect(lastLog.result).toBe('Victory');
  });

  test('4. Robustness: Handle invalid FEN gracefully on move endpoint', async () => {
    const response = await request(app)
      .post('/api/jev-move')
      .send({ fen: 'INVALID_FEN_STRING' });
    
    expect(response.statusCode).toBe(500);
  });
});
