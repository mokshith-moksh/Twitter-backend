import { prismaClient } from "../../client/db";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../client/redis";

const queries = {
  verifyGoogleToken: async (
    parent: any,
    { token }: { token: string },
    context: any
  ) => {
    const AuthToken = await UserService.verifyGoogleAuthToken(token);
    return AuthToken;
  },
  getCurrentUser: async (parent: any, args: any, context: GraphqlContext) => {
    const id = context.user?.id;
    if (!id) return null;
    const user = await UserService.getUserById(id);
    return user;
  },
  getUserById: async (
    parent: any,
    { id }: { id: string },
    context: GraphqlContext
  ) => {
    return await UserService.getUserById(id);
  },
};
const extraResolvers = {
  User: {
    tweets: (parent: User) =>
      prismaClient.tweet.findMany({
        where: {
          Auther: { id: parent.id },
        },
      }),
    followers: async (parent: User) => {
      const result = await prismaClient.follower.findMany({
        where: { following: { id: parent.id } },
        include: { followers: true },
      });
      return result.map((el) => el.followers);
    },
    following: async (parent: User) => {
      const result = await prismaClient.follower.findMany({
        where: { followers: { id: parent.id } },
        include: { following: true },
      });
      return result.map((el) => el.following);
    },
    recommendedUsers : async (parent: User,_:any, context: GraphqlContext) => {
       if(!context.user) return [];
       const cachedValue = await redisClient.get(`RECOMMENDED_USERS:${context.user.id}`);
      if (cachedValue) return JSON.parse(cachedValue);

       const myFollowings = await prismaClient.follower.findMany({
        where:{
          followers: { id: context.user.id}
        },
        include:{
          following: {include:{followers:{include
          :{following:true}}}}
        }
       });
       const userRecommended:User[] = []
       for(const followings of myFollowings){
        for(const followingOfFollowedUser of followings.following.followers){
          if(followingOfFollowedUser.followingId !==context.user.id &&  myFollowings.findIndex(e=> e?.followingId === followingOfFollowedUser.following.id)<0){
            userRecommended.push(followingOfFollowedUser.following)
          }
        }
       }

       await redisClient.set(`RECOMMENDED_USERS:${context.user.id}`, JSON.stringify(userRecommended))
       return userRecommended;
    }
  },
};

const mutations = {
  followUser: async (
    parent: any,
    { to }: { to: string },
    context: GraphqlContext
  ) => {
    if (!context.user || !context.user.id)
      throw new Error("Unauthenticated user");
    await UserService.followUser(context.user.id, to);
    await redisClient.del(`RECOMMENDED_USERS:${context.user.id}`)
    return true;
  },
  unfollowUser: async (
    parent: any,
    { to }: { to: string },
    context: GraphqlContext
  ) => {
    if (!context.user || !context.user.id)
      throw new Error("Unauthenticated user");
    await UserService.unfollowUser(context.user.id, to);
    await redisClient.del(`RECOMMENDED_USERS:${context.user.id}`)
    return true;
  },
};

export const resolvers = { queries, extraResolvers, mutations };
