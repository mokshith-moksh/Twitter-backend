export const mutations =`#graphql
followUser(to: ID!): Boolean
unfollowUser(to: ID!): Boolean
likeUser(to: ID!): Boolean
unLikeUser(to: ID!): Boolean
`