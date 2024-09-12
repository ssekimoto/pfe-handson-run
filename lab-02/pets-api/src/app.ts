import express, { Request, Response } from 'express';

const app = express();
const port = 5000;

const breeds: string[] = [
  "Labrador Retriever",
  "German Shepherd",
  "Golden Retriever",
  "French Bulldog",
  "Bulldog",
  "Poodle",
  "Beagle",
  "Rottweiler",
  "German Shorthaired Pointer",
  "Yorkshire Terrier"
];

// ランダムな犬種を返すエンドポイント
app.get('/random-pets', (req: Request, res: Response) => {
  const randomBreed = breeds[Math.floor(Math.random() * breeds.length)];
  res.json({ breed: randomBreed });
});

// サーバーを指定したポートで開始
app.listen(port, () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
