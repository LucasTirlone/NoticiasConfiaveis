import test from "node:test";
import assert from "node:assert/strict";
import { selectRecentPerTheme } from "./recent-theme-selection";

const rows = [
  {id:"a",timestamp:"2026-10-25T10:00:00",tags:["incendio"]},
  {id:"b",timestamp:"2026-10-26T10:00:00",tags:["incendio","conflito_guerra"]},
  {id:"c",timestamp:"2026-10-27T10:00:00",tags:["incendio","conflito_guerra"]},
];

test("takes only two newest per subfilter and consolidates shared rows",()=>{
  const before=JSON.stringify(rows);
  const result=selectRecentPerTheme(rows,["incendio","conflito_guerra","terremoto"]);
  assert.deepEqual(result.perTheme,[
    {themeId:"incendio",ids:["c","b"]},
    {themeId:"conflito_guerra",ids:["c","b"]},
    {themeId:"terremoto",ids:[]},
  ]);
  assert.deepEqual(result.selected.map(({row,selectedFor})=>({id:row.id,selectedFor})),[
    {id:"c",selectedFor:["incendio","conflito_guerra"]},
    {id:"b",selectedFor:["incendio","conflito_guerra"]},
  ]);
  assert.equal(JSON.stringify(rows),before);
});

test("singletons are preserved and date ties are deterministic",()=>{
  const result=selectRecentPerTheme([
    {id:"z",timestamp:"2026-10-27 10:00:00",tags:["a"]},
    {id:"b",timestamp:"2026-10-27T10:00:00Z",tags:["a","b"]},
    {id:"a",timestamp:"2026-10-27T10:00:00",tags:["a"]},
  ],["a","b"]);
  assert.deepEqual(result.perTheme,[{themeId:"a",ids:["a","b"]},{themeId:"b",ids:["b"]}]);
});

test("invalid rows, duplicate IDs and invalid limits fail explicitly",()=>{
  assert.throws(()=>selectRecentPerTheme([...rows,rows[0]],["incendio"]),/duplicado/);
  assert.throws(()=>selectRecentPerTheme([{...rows[0],timestamp:"bad"}],["incendio"]),/Data inválida/);
  assert.throws(()=>selectRecentPerTheme(rows,["incendio"],0),/Limite inválido/);
  assert.throws(()=>selectRecentPerTheme(rows,["incendio","incendio"]),/Subfiltro duplicado/);
});
