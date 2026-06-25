using FluentValidation;

namespace TravelProject.Infrastructure
{
    public class ValidationFilter<TRequest>(IValidator<TRequest> validator) : IEndpointFilter
    {
        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
        {
            var request = ctx.Arguments.OfType<TRequest>().FirstOrDefault();
            if (request is null) return await next(ctx);

            var result = await validator.ValidateAsync(request);
            if (!result.IsValid)
                return Results.ValidationProblem(result.ToDictionary());

            return await next(ctx);
        }
    }
}
