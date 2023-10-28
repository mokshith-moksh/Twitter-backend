import { ApolloServer } from "@apollo/server";
import express from "express";
import { expressMiddleware } from "@apollo/server/express4";
import bodyParser from "body-parser";
import { User } from "./user";
import cors from "cors";
import { GraphqlContext } from "../interfaces";
import JWTService from "../services/jwt";
import { Tweet } from "./tweet";



export async function initServer() {
  const app = express();
  app.get('/',(req,res)=>res.status(200).json({message: 'OK'}));
  const graphqlServer = new ApolloServer<GraphqlContext>({
    typeDefs: `
      ${User.types}
      ${Tweet.types}
      type Query{
        ${User.queries}
        ${Tweet.queries}
      }
      type Mutation{
        ${Tweet.mutation}
        ${User.mutations}
       
      }
    `,
    resolvers: {
      Query: {
        ...User.resolvers.queries,
        ...Tweet.resolvers.queries
      },
      Mutation: {
        ...Tweet.resolvers.mutation,
        ...User.resolvers.mutations,
        
      },

      ...Tweet.resolvers.extraResolver,
      ...User.resolvers.extraResolvers
    },
  });
  await graphqlServer.start();
  app.use(cors());
  app.use(bodyParser.json());
  app.use(
    "/graphql",
    expressMiddleware(graphqlServer, {
      context: async ({ req }) => ({
        user: req.headers.authorization
          ? JWTService.decodeToken(
              req.headers.authorization.split("Bearer ")[1]
            )
          : undefined,
      }),
    })
  );

  return app;
}
