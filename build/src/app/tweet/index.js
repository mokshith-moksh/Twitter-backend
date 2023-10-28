"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tweet = void 0;
const types_1 = require("./types");
const mutations_1 = require("./mutations");
const resolver_1 = require("./resolver");
const queries_1 = require("./queries");
exports.Tweet = { types: types_1.types, mutation: mutations_1.mutation, resolvers: resolver_1.resolvers, queries: queries_1.queries };
