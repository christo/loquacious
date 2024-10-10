import {marked} from 'marked';
import React, {useEffect, useState} from 'react';
import "./App.css";

interface ChatResponse {
  message: string;
}

const responseError = (e: any): ChatResponse => ({
  message: `Error fetching response: ${e}`,
});

const RESPONSE_NULL: ChatResponse = {
  message: "",
}

const RESPONSE_NONE: ChatResponse = {
  message: "No response from GPT",
}

function markdownResponse(response: ChatResponse) {
  if (response !== null) {
    return marked.parse(response.message);
  } else {
    return "";
  }
}

type HealthError = {
  code: number,
  message: string;
  type: string;
}

type HealthStatus = {
  error: HealthError | null;
  message: string | null;
} | null;

function ShowError({error}: { error: HealthError }) {
  return <div>error: {error.message}</div>;
}

function Status() {
  const [status, setStatus] = useState<HealthStatus>(null);

  function fetchData() {
    fetch("http://localhost:3001/health").then(result => {
      result.json().then(data => {
        setStatus(data || null);
      });
    });
  }

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 5000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);




  return status === null ? <div>...</div> : (
    status?.error ? <ShowError error={status.error}/>
      : <div>status: ok</div>
  );

}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse>(RESPONSE_NULL);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }
    setLoading(true);

    try {
      const result = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({prompt}),
      });

      const data = await result.json();
      setResponse(data.response || RESPONSE_NONE);
    } catch (error) {
      console.error('Error fetching response:', error);
      setResponse(responseError(error));
    } finally {
      setLoading(false);
    }
  };

  function showResponse() {
    return (<>
      <div>
        <h2 className='lobster-regular'>Response</h2>
        <div dangerouslySetInnerHTML={{__html: markdownResponse(response)}}></div>
      </div>
    </>)

  }

  // submit on enter
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      await handleSubmit(); // Submit the form
    }
  };
  return (
    <div className="card">
      <Status/>
      <h1 className="lobster-regular">Loquacious</h1>
      <form>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={20}
          cols={80}
          placeholder="talk to me"
        />
      </form>

      {loading ? <p>Loading...</p> : response === RESPONSE_NULL ? "" : showResponse()}

    </div>
  );
};

export default App;