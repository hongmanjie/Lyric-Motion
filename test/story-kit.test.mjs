import test from 'node:test';
import assert from 'node:assert/strict';
import {actionPhase,lerpFace,expressions,handPositions} from '../examples/styles/painted-story/story-kit.mjs';

test('acting phases separate anticipation, action and reaction with repeatable random seeks',()=>{
 const config={at:2,anticipation:.25,action:.75,reaction:.5};
 assert.deepEqual(actionPhase(1,config),{anticipation:0,action:0,reaction:0,done:false});
 assert.equal(actionPhase(2.25,config).action,0);assert.equal(actionPhase(3,config).action,1);assert.equal(actionPhase(3,config).reaction,0);assert.equal(actionPhase(3.5,config).done,true);
 const times=[3.3,2.1,8,0,2.8],results=times.map(t=>actionPhase(t,config));
 assert.deepEqual(times.map(t=>actionPhase(t,config)),results);
 assert.throws(()=>actionPhase(0,{action:0}),/positive duration/);assert.throws(()=>actionPhase(NaN),/finite/);
});

test('expression blending preserves endpoints and hand anchors follow mirrored/rotated poses',()=>{
 for(const [progress,expected] of [[0,expressions.sad],[1,expressions.calm]])for(const [key,value]of Object.entries(lerpFace(expressions.sad,expressions.calm,progress)))assert.ok(Math.abs(value-expected[key])<1e-12);
 const h=handPositions({x:100,y:200,scale:2,facing:-1,left:[10,0],right:[0,20],rotation:Math.PI/2});
 assert.ok(Math.abs(h.left[0]-100)<1e-9);assert.ok(Math.abs(h.left[1]-220)<1e-9);assert.ok(Math.abs(h.right[0]-140)<1e-9);assert.ok(Math.abs(h.right[1]-200)<1e-9);
});
