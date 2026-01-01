import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const SharedRedirect: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code || code.length < 2) {
        navigate('/'); 
        return;
    }

    try {
        // Format: [type_char][base36_id]
        // m = movie, t = tv
        // Example: m550 -> movie, id 550 (decimal)
        
        const typeChar = code.charAt(0).toLowerCase();
        const idBase36 = code.slice(1);
        const id = parseInt(idBase36, 36);

        if (isNaN(id)) throw new Error('Invalid ID');

        let type = '';
        if (typeChar === 'm') type = 'movie';
        else if (typeChar === 't') type = 'tv';
        else if (typeChar === 'p') type = 'person';
        else if (typeChar === 'c') type = 'collection';
        else throw new Error('Invalid Type');

        const targetPath = type === 'person' 
            ? `/person/${id}` 
            : type === 'collection' 
            ? `/collection/${id}` 
            : `/details/${type}/${id}`;

        navigate(targetPath, { replace: true });

    } catch (e) {
        console.error("Invalid short code", e);
        navigate('/');
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm animate-pulse">Redirecting...</p>
    </div>
  );
};

export default SharedRedirect;