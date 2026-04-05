import React from 'react';
import { renderToString } from 'react-dom/server';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

const data = [
  { name: 'A', fullDay: [0, 24], blocks: [[6, 18]] }
];

const CustomShape = (props: any) => {
  return <text id="SHAPE_PROPS">{JSON.stringify({y: props.y, height: props.height, payload: props.payload})}</text>;
};

const App = () => (
  <BarChart width={400} height={400} data={data}>
    <XAxis dataKey="name" />
    <YAxis domain={[0, 24]} reversed={true} />
    <Bar dataKey="fullDay" shape={<CustomShape />} isAnimationActive={false} />
  </BarChart>
);

console.log(renderToString(<App />));
