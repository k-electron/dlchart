import React from 'react';
import { renderToString } from 'react-dom/server';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

const DaylightBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  const dataItem = payload && payload.blocks ? payload : (payload && payload.payload ? payload.payload : {});
  const blocks = dataItem.blocks || [];
  
  return <text id="SHAPE_PROPS">{JSON.stringify({x, y, width, height, payloadKeys: payload ? Object.keys(payload) : null, blocks})}</text>;
};

const data = [
  { name: 'A', fullDay: 24, blocks: [[6, 18]] }
];

const TestApp = () => (
  <BarChart width={400} height={400} data={data}>
    <XAxis dataKey="name" />
    <YAxis domain={[0, 24]} reversed={true} />
    <Bar dataKey="fullDay" shape={<DaylightBar />} isAnimationActive={false} />
  </BarChart>
);

console.log(renderToString(<TestApp />));
