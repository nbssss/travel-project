using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

public class AuthTests(TravelProjectFactory factory) : IClassFixture<TravelProjectFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Register_ValidData_ReturnsOkWithIdAndEmail()
    {
        var response = await _client.PostAsJsonAsync("/register", new
        {
            userName = "validuser",
            email = "valid@example.com",
            password = "Test123!"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.TryGetProperty("id", out _), "Response should contain 'id'");
        Assert.Equal("valid@example.com", body.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Register_DuplicateUsername_ReturnsBadRequest()
    {
        var payload = new { userName = "dupuser", email = "dup@example.com", password = "Test123!" };
        await _client.PostAsJsonAsync("/register", payload);

        var response = await _client.PostAsJsonAsync("/register", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsAccessToken()
    {
        const string userName = "loginuser";
        const string password = "Test123!";
        await _client.PostAsJsonAsync("/register", new
        {
            userName,
            email = "login@example.com",
            password
        });

        var response = await _client.PostAsJsonAsync("/login", new { userName, password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("accessToken").GetString();
        Assert.False(string.IsNullOrEmpty(token));
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        var response = await _client.PostAsJsonAsync("/login", new
        {
            userName = "nobody",
            password = "Wrong123!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
