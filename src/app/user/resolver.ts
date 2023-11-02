import { prismaClient } from "../../client/db";
import { GraphqlContext } from "../../interfaces";
import { User } from "@prisma/client";
import UserService from "../../services/user";
import { redisClient } from "../../client/redis";
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(process.env.DATABASE_URI as string, process.env.SUPER_BASE_ANON_KEY as string)
 
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
  getAllUser: async (
    parent: any,
    { id }: { id: string },
    context: GraphqlContext
  ) => {
    return await prismaClient.user.findMany()
  },
  getSearchUser:async (
    parent: any,
    { searchQuery }: { searchQuery: string },
    context: GraphqlContext
  ) => {
    const { data: filteredMoviesData, error } = await supabaseClient
    .from('User')
    .select('*')
    .textSearch('firstName', searchQuery);

    if (error) {
      // Handle any errors here
      console.log(error)
      throw new Error('Failed to perform the text search');
    }
  
    return filteredMoviesData;
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
      const result = await prismaClient.follows.findMany({
        where: { following: { id: parent.id } },
        include: { follower: true },
      });
      return result.map((el) => el.follower);
    },
    following: async (parent: User) => {
      const result = await prismaClient.follows.findMany({
        where: { follower: { id: parent.id } },
        include: { following: true },
      });
      return result.map((el) => el.following);
    },
    recommendedUsers: async (parent: User, _: any, context: GraphqlContext) => {
      if (!context.user) return [];
      const cachedValue = await redisClient.get(
        `RECOMMENDED_USERS:${context.user.id}`
      );
      if (cachedValue) return JSON.parse(cachedValue);

      const myFollowings = await prismaClient.follows.findMany({
        where: {
          follower: { id: context.user.id },
        },
        include: {
          following: {
            include: { followers: { include: { following: true } } },
          },
        },
      });
      const userRecommended: User[] = [];
      for (const followings of myFollowings) {
        for (const followingOfFollowedUser of followings.following.followers) {
          if (
            followingOfFollowedUser.following.id !== context.user.id &&
            myFollowings.findIndex(
              (e) => e?.followingId === followingOfFollowedUser.following.id
            ) < 0
          ) {
            userRecommended.push(followingOfFollowedUser.following);
          }
        }
      }

      await redisClient.set(
        `RECOMMENDED_USERS:${context.user.id}`,
        JSON.stringify(userRecommended)
      );
      return userRecommended;
    },
    likedTweets: async (parent: User, _: any, context: GraphqlContext) => {
      if (!context.user) return [];
      const likedtweets = await prismaClient.likes.findMany({
        where: { userId: context.user.id },
        include: {
          tweet: true,
        },
      });
      return likedtweets.map((tw) => tw.tweet);
    },
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
    await redisClient.del(`RECOMMENDED_USERS:${context.user.id}`);
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
    await redisClient.del(`RECOMMENDED_USERS:${context.user.id}`);
    return true;
  },
  likeUser: async (
    parent: any,
    { to }: { to: string },
    context: GraphqlContext
  ) => {
    if (!context.user || !context.user.id)
      throw new Error("Unauthenticated user");
    try {
      await prismaClient.likes.create({
        data: {
          userId: context.user.id,
          tweetId: to,
        },
      });
    } catch (error) {
      console.log(error);
      throw new Error("Not able to Like Tweet");
    }
    return true;
  },
  unLikeUser: async (
    parent: any,
    { to }: { to: string },
    context: GraphqlContext
  ) => {
    if (!context.user || !context.user.id)
      throw new Error("Unauthenticated user");
    try {
      await prismaClient.likes.delete({
        where: {
          tweetId_userId: {
            tweetId: to,
            userId: context.user.id,
          },
        },
      });
    } catch (error) {
      console.log(error);
      throw new Error("Not able to Unlike Tweet");
    }
    return true;
  },
};

export const resolvers = { queries, extraResolvers, mutations };
