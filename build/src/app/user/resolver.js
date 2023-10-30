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
const user_1 = __importDefault(require("../../services/user"));
const redis_1 = require("../../client/redis");
const queries = {
    verifyGoogleToken: (parent, { token }, context) => __awaiter(void 0, void 0, void 0, function* () {
        const AuthToken = yield user_1.default.verifyGoogleAuthToken(token);
        return AuthToken;
    }),
    getCurrentUser: (parent, args, context) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const id = (_a = context.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!id)
            return null;
        const user = yield user_1.default.getUserById(id);
        return user;
    }),
    getUserById: (parent, { id }, context) => __awaiter(void 0, void 0, void 0, function* () {
        return yield user_1.default.getUserById(id);
    }),
};
const extraResolvers = {
    User: {
        tweets: (parent) => db_1.prismaClient.tweet.findMany({
            where: {
                Auther: { id: parent.id },
            },
        }),
        followers: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db_1.prismaClient.follows.findMany({
                where: { following: { id: parent.id } },
                include: { follower: true },
            });
            return result.map((el) => el.follower);
        }),
        following: (parent) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield db_1.prismaClient.follows.findMany({
                where: { follower: { id: parent.id } },
                include: { following: true },
            });
            return result.map((el) => el.following);
        }),
        recommendedUsers: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.user)
                return [];
            const cachedValue = yield redis_1.redisClient.get(`RECOMMENDED_USERS:${context.user.id}`);
            if (cachedValue)
                return JSON.parse(cachedValue);
            const myFollowings = yield db_1.prismaClient.follows.findMany({
                where: {
                    follower: { id: context.user.id },
                },
                include: {
                    following: {
                        include: { followers: { include: { following: true } } },
                    },
                },
            });
            const userRecommended = [];
            for (const followings of myFollowings) {
                for (const followingOfFollowedUser of followings.following.followers) {
                    if (followingOfFollowedUser.following.id !== context.user.id &&
                        myFollowings.findIndex((e) => (e === null || e === void 0 ? void 0 : e.followingId) === followingOfFollowedUser.following.id) < 0) {
                        userRecommended.push(followingOfFollowedUser.following);
                    }
                }
            }
            yield redis_1.redisClient.set(`RECOMMENDED_USERS:${context.user.id}`, JSON.stringify(userRecommended));
            return userRecommended;
        }),
        likedTweets: (parent, _, context) => __awaiter(void 0, void 0, void 0, function* () {
            if (!context.user)
                return [];
            const likedtweets = yield db_1.prismaClient.likes.findMany({
                where: { userId: context.user.id },
                include: {
                    tweet: true,
                }
            });
            return likedtweets.map(tw => tw.tweet);
        })
    },
};
const mutations = {
    followUser: (parent, { to }, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context.user || !context.user.id)
            throw new Error("Unauthenticated user");
        yield user_1.default.followUser(context.user.id, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${context.user.id}`);
        return true;
    }),
    unfollowUser: (parent, { to }, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context.user || !context.user.id)
            throw new Error("Unauthenticated user");
        yield user_1.default.unfollowUser(context.user.id, to);
        yield redis_1.redisClient.del(`RECOMMENDED_USERS:${context.user.id}`);
        return true;
    }),
    likeUser: (parent, { to }, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context.user || !context.user.id)
            throw new Error("Unauthenticated user");
        yield db_1.prismaClient.likes.create({
            data: {
                userId: context.user.id,
                tweetId: to,
            },
        });
        return true;
    }),
    unLikeUser: (parent, { to }, context) => __awaiter(void 0, void 0, void 0, function* () {
        if (!context.user || !context.user.id)
            throw new Error("Unauthenticated user");
        yield db_1.prismaClient.likes.delete({
            where: {
                tweetId_userId: {
                    tweetId: to,
                    userId: context.user.id,
                },
            },
        });
        return true;
    }),
};
exports.resolvers = { queries, extraResolvers, mutations };
