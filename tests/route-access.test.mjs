import test from 'node:test';
import assert from 'node:assert/strict';
import {requiresSignIn} from '../lib/route-access.ts';
test('all story steps and former preview URLs require login',()=>{
 for(const path of ['/','/preview','/stories','/stories?preview=1','/journeys?preview=1','/journeys/routes?preview=1','/profile','/members','/explore']){
  assert.equal(requiresSignIn(new URL(path,'https://example.test').pathname),true,path);
 }
});
test('login, OAuth callback and font assets remain accessible before login',()=>{
 for(const path of ['/login','/auth/callback','/fonts/UnifrakturMaguntia-Book.ttf','/_next/static/app.js','/icon.svg','/favicon.ico'])assert.equal(requiresSignIn(path),false,path);
 assert.equal(requiresSignIn('/login-extra'),true);
});
