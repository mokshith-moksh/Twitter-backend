"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const db_1 = require("../../client/db");
//three thing for s3
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const user_1 = __importDefault(require("../../services/user"));
const redis_1 = require("../../client/redis");
//instance for s3
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_DEFAULT_REGION,
});
const mutation = {
    addTweet: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context.user)
            throw new Error("user not authenticated");
        const rateLimitflag = yield redis_1.redisClient.get(`RATE_LIMIT:TWEET:${context.user}`);
        if (rateLimitflag)
            throw new Error("Please wait...");
        const tweet = yield db_1.prismaClient.tweet.create({
            data: {
                content: args.content,
                imageUrl: args.imageUrl,
                Auther: { connect: { id: context.user.id } },
            },
        });
        yield redis_1.redisClient.setex(`RATE_LIMIT:TWEET:${context.user}`, 10, 1);
        return tweet;
    }),
};
const extraResolver = {
    Tweet: {
        auther: (parent) => user_1.default.getUserById(parent.autherId),
        likes: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const likedUsers = yield db_1.prismaClient.likes.findMany({
                    where: {
                        tweetId: parent.id
                    },
                    include: {
                        user: true
                    }
                });
                return likedUsers.map((likedUser) => likedUser.user);
            }
            catch (error) {
                console.log(error);
                throw new Error("not able to fetch liked user");
            }
        })
    },
};
const queries = {
    getAllTweets: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
        return yield db_1.prismaClient.tweet.findMany();
    }),
    //geting signed url
    getSignedURLForTweet: (parent, { imageType, imageName }, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context.user || !context.user.id)
            throw new Error("Unauthenticated");
        const allowedImageTypes = [
            "image/jpg",
            "image/jpeg",
            "image/png",
            "image/webp",
        ];
        if (!allowedImageTypes.includes(imageType))
            throw new Error("Unsupported Image Type");
        const putObjectCommand = new client_s3_1.PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            ContentType: imageType,
            Key: `uploads/${context.user.id}/tweets/${imageName}-${Date.now()}`,
        });
        const signedURL = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client, putObjectCommand);
        return signedURL;
    }),
};
exports.resolvers = { mutation, extraResolver, queries };
