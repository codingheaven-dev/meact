import Meact from "./Meact";
import "./App.css";

/** @jsx Meact.createElement */
function User({ user }) {
  return (
    <div>
      <h4 style={{ backgroundColor: "hotpink" }}>
        {user.lastName}; {user.firstName}
      </h4>
      <img src="avatar.jpg" alt="" width="100" className="profile" />
      <input disabled={false} value="Hello there" />
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card card--expanded">
      <h3 className="card-title">{title}</h3>
      <div className="card-body">{children}</div>
    </div>
  );
}

const user = {
  firstName: "John",
  lastName: "Doe",
  image: "avatar.jpeg",
  title: "Cool dude",
};

function App() {
  return (
    <main className="cards">
      <Card title={`${user.firstName} ${user.lastName}`}>
        <User user={user} />
      </Card>
    </main>
  );
}

export default App;
