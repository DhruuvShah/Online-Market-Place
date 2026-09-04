const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const connectDB = require("../../src/db/db");
const userModel = require("../../src/models/user.model");

describe("PATCH /api/auth/users/me", () => {
  beforeAll(async () => {
    await connectDB();
  });

  const password = "Secret123!";

  const seedAndLogin = async (overrides = {}) => {
    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username: overrides.username ?? "profile_user",
      email: overrides.email ?? "profile@example.com",
      password: hash,
      fullName: { firstName: "Profile", lastName: "User" },
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password });

    return { user, cookie: loginRes.headers["set-cookie"] };
  };

  it("requires authentication", async () => {
    const res = await request(app)
      .patch("/api/auth/users/me")
      .send({ username: "someone_else" });

    expect(res.status).toBe(401);
  });

  it("rejects a username shorter than three characters", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ username: "ab" });

    expect(res.status).toBe(400);
  });

  it("rejects a malformed email", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when no updatable field is provided", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ role: "seller" });

    expect(res.status).toBe(400);
  });

  it("updates the username and returns the updated user", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ username: "renamed_user" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("renamed_user");
  });

  it("updates only the provided half of fullName", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ fullName: { firstName: "Renamed" } });

    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toEqual({
      firstName: "Renamed",
      lastName: "User",
    });
  });

  it("does not change the role even when one is sent", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ username: "still_a_user", role: "seller" });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("user");
  });

  it("returns 409 when the email belongs to another account", async () => {
    await userModel.create({
      username: "taken_user",
      email: "taken@example.com",
      password: await bcrypt.hash(password, 10),
      fullName: { firstName: "Taken", lastName: "User" },
    });

    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ email: "taken@example.com" });

    expect(res.status).toBe(409);
  });

  it("allows submitting the caller's own unchanged email", async () => {
    const { cookie } = await seedAndLogin();

    const res = await request(app)
      .patch("/api/auth/users/me")
      .set("Cookie", cookie)
      .send({ email: "profile@example.com", username: "same_email_user" });

    expect(res.status).toBe(200);
  });
});
