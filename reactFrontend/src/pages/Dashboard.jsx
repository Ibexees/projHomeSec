export default function Dashboard() {

  const turnOn = async () => {
    await fetch("http://localhost:3000/i/on");
  };

  const turnOff = async () => {
    await fetch("http://localhost:3000/i/off");
  };

    const testprotected = async () => {
    await fetch("http://localhost:3000/protected", {
  method: "GET",
  credentials: "include"
});
  };

  return (
    <div>
      <h1>Dashboard</h1>

      <button onClick={turnOn}>Einschalten</button>
      <button onClick={turnOff}>Ausschalten</button>
      <button onClick={testprotected}>protected</button>
    </div>
  );
}