import React from 'react';
import { useParams } from 'react-router-dom';
import PollResults from './PollResults';

const PublicPollResults: React.FC = () => {
  const { sessionToken } = useParams<{ sessionToken?: string }>();
  
  return <PollResults sessionToken={sessionToken} />;
};

export default PublicPollResults;
