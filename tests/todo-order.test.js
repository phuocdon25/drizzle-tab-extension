import test from 'node:test';
import assert from 'node:assert/strict';
import { compareDisplayOrder, reorderTodos } from '../js/todo-logic.js';
const tasks = () => ['A', 'B', 'C', 'D'].map((id, createdAt) => ({ id, title: id, createdAt, done: false, priority: 'medium' }));
const ids = (todos) => [...todos].filter(t => !t.hidden && !t.done).sort(compareDisplayOrder).map(t => t.id);
test('C moves before A and survives JSON storage round trip', () => {
  const original = tasks();
  const result = reorderTodos(original, 'C', 'A');
  assert.deepEqual(ids(JSON.parse(JSON.stringify(result))), ['C', 'A', 'B', 'D']);
  assert.deepEqual(ids(original), ['A', 'B', 'C', 'D']);
});
test('moves down and repeatedly reorders', () => {
  const result = reorderTodos(tasks(), 'A', 'D', true);
  assert.deepEqual(ids(result), ['B', 'C', 'D', 'A']);
  assert.deepEqual(ids(reorderTodos(result, 'D', 'B')), ['D', 'B', 'C', 'A']);
});
test('manual order overrides deadline and priority sorting', () => {
  const original = tasks();
  original[0].deadline = '2020-01-01'; original[0].priority = 'high';
  assert.deepEqual(ids(reorderTodos(original, 'C', 'A')), ['C', 'A', 'B', 'D']);
});
test('filtered moves retain other tasks and hidden/completed records', () => {
  const hidden = { id: 'hidden', hidden: true, done: false };
  const done = { id: 'done', done: true };
  const result = reorderTodos([...tasks(), hidden, done], 'D', 'B');
  assert.deepEqual(ids(result), ['A', 'D', 'B', 'C']);
  assert.equal(result.at(-2), hidden); assert.equal(result.at(-1), done);
});
test('invalid, cross-group, hidden and self drops leave data unchanged', () => {
  const original = [...tasks(), { id: 'done', done: true }, { id: 'hidden', hidden: true, done: false }];
  for (const [source, target] of [['A', 'A'], ['missing', 'A'], ['A', 'missing'], ['A', 'done'], ['hidden', 'A'], ['A', 'hidden']]) {
    assert.equal(reorderTodos(original, source, target), original);
  }
});
test('completed tasks can be reordered within their group', () => {
  const original = tasks().map(task => ({ ...task, done: true, completedAt: task.createdAt }));
  const result = reorderTodos(original, 'A', 'D');
  assert.deepEqual([...result].sort(compareDisplayOrder).map(t => t.id), ['A', 'D', 'C', 'B']);
});
