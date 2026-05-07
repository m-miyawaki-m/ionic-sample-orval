import Axios, { type AxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

export const axiosInstance = Axios.create({ baseURL })

export const axios = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source()
  const promise = axiosInstance({ ...config, cancelToken: source.token }).then(
    ({ data }) => data,
  )
  // @ts-expect-error allow cancel attach
  promise.cancel = () => source.cancel('Query was cancelled')
  return promise as Promise<T>
}
