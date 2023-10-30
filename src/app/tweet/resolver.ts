import { Tweet } from "@prisma/client";
import { prismaClient } from "../../client/db";
import { GraphqlContext } from "../../interfaces";

//three thing for s3
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import UserService from "../../services/user";
import { redisClient } from "../../client/redis";

interface TweetContainer {
  imageUrl: string;
  content: string;
}

//instance for s3
const s3Client = new S3Client({
    region: process.env.AWS_DEFAULT_REGION,
});

const mutation = {
  addTweet: async (
    parent: any,
    args: TweetContainer,
    context: GraphqlContext
  ) => {
    if (!context.user) throw new Error("user not authenticated");
   const rateLimitflag = await redisClient.get(`RATE_LIMIT:TWEET:${context.user}`)
   if(rateLimitflag) throw new Error("Please wait...");

    const tweet = await prismaClient.tweet.create({
      data: {
        content: args.content,
        imageUrl: args.imageUrl,
        Auther: { connect: { id: context.user.id } },
      },
    });
    await redisClient.setex(`RATE_LIMIT:TWEET:${context.user}`,10,1)
    return tweet;
  },
};

const extraResolver = {
  Tweet: {
    auther: (parent: Tweet) => UserService.getUserById(parent.autherId),
  },
};

const queries = {
  getAllTweets: async (parent: any, args: any, context: any) => {
    return await prismaClient.tweet.findMany();
  },
  //geting signed url
  getSignedURLForTweet: async (
    parent: any,
    { imageType, imageName }: { imageType: string; imageName: string },
    context: GraphqlContext
  ) => {
    if (!context.user || !context.user.id) throw new Error("Unauthenticated");
    const allowedImageTypes = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedImageTypes.includes(imageType))
      throw new Error("Unsupported Image Type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      ContentType: imageType,
      Key: `uploads/${context.user.id}/tweets/${imageName}-${Date.now()}`,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand);

    return signedURL;
  },
};

export const resolvers = { mutation, extraResolver, queries };
