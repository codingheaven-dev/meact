import Meact from "./Meact";
import "./App.css";

/** @jsx Meact.createElement */
function User({ user }) {
  return (
    <div>
      <h3
        style={{ backgroundColor: "hotpink" }}
        onMouseMove={() => console.log("Mouse is moving!")}
      >
        {user.lastName}; {user.firstName}
      </h3>
      <img src="avatar.jpg" alt="" width="200" className="profile" />
      <input disabled={false} value="Hello there" />
    </div>
  );
}

function Card({ title, onClick, children }) {
  return (
    <div className="card card--expanded">
      <h2 className="card-title" onClick={onClick}>
        {title}
      </h2>
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
      <Card
        title={`${user.firstName} ${user.lastName}`}
        onClick={() => console.log("Clicking the card")}
      >
        <User user={user} />
      </Card>
    </main>
  );
}

export default App;
