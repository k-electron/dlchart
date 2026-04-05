import React from 'react';
import { renderToString } from 'react-dom/server';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

const data = [
  { name: 'A', times1: [0, 10], times2: [20, 24] }
];

const App = () => (
  <BarChart width={400} height={400} data={data}>
    <XAxis dataKey="name" />
    <YAxis domain={[0, 24]} />
    <Bar dataKey="times1" stackId="a" fill="red" />
    <Bar dataKey="times2" stackId="a" fill="blue" />
  </BarChart>
);

console.log(renderToString(<App />));
