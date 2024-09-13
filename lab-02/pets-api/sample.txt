import express, { Request, Response } from 'express';

const app = express();
const port = 5000;

const dogBreeds: string[] = [
  "Labrador Retriever",
  "German Shepherd",
  "Golden Retriever",
  "French Bulldog",
  "Bulldog",
  "Poodle",
  "Beagle",
  "Rottweiler",
  "German Shorthaired P   ointer",
  "Yorkshire Terrier"
];

const catBreeds: string[] = [
  "Persian Cat",
  "Maine Coon",
  "Ragdoll",
  "Siamese Cat",
  "British Shorthair",
  "Sphynx Cat",
  "Scottish Fold",
  "Abyssinian",
  "Bengal Cat",
  "Russian Blue"
];

// ランダムなペットを返すエンドポイント
app.get('/random-pets', (req: Request, res: Response) => {
  const isDog = Math.random() < 0.5; // 50%の確率で犬か猫を決定
  let animalType = "dog";
  let randomBreed: string;

  if (isDog) {
    randomBreed = dogBreeds[Math.floor(Math.random() * dogBreeds.length)];
  } else {
    randomBreed = catBreeds[Math.floor(Math.random() * catBreeds.length)];
    animalType = "cat";
  }

  res.json({ animal: animalType, breed: randomBreed });
});

// サーバーを指定したポートで開始
app.listen(port, () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
