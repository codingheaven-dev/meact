import Meact from "./Meact";
import "./App.css";

/** @jsx Meact.createElement */
function User({ user }) {
  return (
    <div>
      <h4
        style={{ backgroundColor: "hotpink" }}
        onMouseMove={() => console.log("Mouse is moving!")}
      >
        {user.lastName}; {user.firstName}
      </h4>
      <img src="avatar.jpg" alt="" width="150" className="profile" />
      <input disabled={false} value="Hello there" />
    </div>
  );
}

function Card({ isExpanded, title, onClick, children }) {
  return (
    <div className={`card ${isExpanded ? "card--expanded" : ""}`}>
      <h3 className="card-title" onClick={onClick}>
        {title}
      </h3>
      {isExpanded && <div className="card-body">{children}</div>}
    </div>
  );
}

const users = [
  {
    firstName: "John",
    lastName: "Doe",
    image: "avatar.jpeg",
    title: "Cool dude",
  },
  {
    firstName: "Peter",
    lastName: "Gabriel",
    image: "avatar.jpeg",
    title: "Cool dude",
  },
  {
    firstName: "Marky",
    lastName: "Mark",
    image: "avatar.jpeg",
    title: "Cool dude",
  },
  {
    firstName: "Joe",
    lastName: "Pesci",
    image: "avatar.jpeg",
    title: "Cool dude",
  },
  {
    firstName: "Frank",
    lastName: "Sinatra",
    image: "avatar.jpeg",
    title: "Cool dude",
  },
];

function App() {
  const [expandedIndex, setExpandedIndex] = Meact.useState(null);
  return (
    <main className="cards">
      {users.map((user, index) => (
        <Card
          isExpanded={expandedIndex === index}
          title={`${user.firstName} ${user.lastName}`}
          onClick={() =>
            setExpandedIndex(expandedIndex === index ? null : index)
          }
        >
          <User user={user} />
        </Card>
      ))}
    </main>
  );
}

export default App;
